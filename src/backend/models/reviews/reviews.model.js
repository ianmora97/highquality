const mongoose = require('mongoose');

const Review    = require('./reviews.schema');
const Directory = require('../clients/directory.model');

const PAGE_SIZE = 12;
const PAGE_MAX  = 50;

// One review per phone per day — a client can't be spammed into a five-star
// wall by someone hammering refresh, and one bad night doesn't get buried
// under a dozen duplicate submissions.
const THROTTLE_MS = 24 * 60 * 60 * 1000;

const STATUSES = new Set(['pending', 'approved', 'rejected']);

class ReviewError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

function clampInt(value, fallback, min, max) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}

function digits(value) {
    return String(value ?? '').replace(/\D/g, '');
}

// ─── author-facing ──────────────────────────────────────────────────────────

/**
 * `author` is the authenticated client (req.user: {id, name, phone}) — the
 * name and phone stamped on the review always come from the session, never
 * from the request body, so nobody can post as someone else.
 */
exports.create = async (body = {}, author) => {
    if (!author) throw new ReviewError('Debes iniciar sesión para dejar una reseña.', 401);

    const review = String(body.review || '').trim();
    const stars  = parseInt(body.stars, 10);

    if (!review) throw new ReviewError('Escribe tu reseña.');
    if (review.length > 600) throw new ReviewError('La reseña es demasiado larga.');
    if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
        throw new ReviewError('Selecciona una calificación de 1 a 5 estrellas.');
    }

    const phone = author.phone ? parseInt(digits(author.phone), 10) : undefined;

    if (phone) {
        const recent = await Review.findOne({
            phone,
            createdAt: { $gte: new Date(Date.now() - THROTTLE_MS) },
        });
        if (recent) throw new ReviewError('Ya enviaste una reseña en las últimas 24 horas.', 429);
    }

    return Review.create({
        nombre: author.name || 'Cliente',
        phone,
        userId: author.id,
        review,
        stars,
        status: 'pending',
    });
};

/** A logged-in client's own reviews, regardless of status. */
exports.mine = async (author) => {
    if (!author) throw new ReviewError('Debes iniciar sesión.', 401);
    const phone = author.phone ? parseInt(digits(author.phone), 10) : undefined;
    const or = [{ userId: author.id }];
    if (phone) or.push({ phone });
    return Review.find({ $or: or }).sort({ createdAt: -1 }).lean();
};

// ─── public display ─────────────────────────────────────────────────────────

exports.getDisplay = async () => {
    return Review.find({ status: 'approved' }).sort({ createdAt: -1 }).limit(30).lean();
};

// ─── admin queue ─────────────────────────────────────────────────────────────

const SORTS = {
    recientes: { createdAt: -1 },
    antiguas:  { createdAt: 1 },
    altas:     { stars: -1, createdAt: -1 },
    bajas:     { stars: 1, createdAt: -1 },
};

function buildFilter({ status, stars, search }) {
    const filter = {};
    if (status && STATUSES.has(status)) filter.status = status;

    const starsN = parseInt(stars, 10);
    if (Number.isFinite(starsN) && starsN >= 1 && starsN <= 5) filter.stars = starsN;

    const q = String(search || '').trim();
    if (q) {
        const qDigits = digits(q);
        const or = [
            { nombre: { $regex: q, $options: 'i' } },
            { review: { $regex: q, $options: 'i' } },
        ];
        if (qDigits) or.push({ phone: parseInt(qDigits, 10) });
        filter.$or = or;
    }
    return filter;
}

/** Overall counts + rating distribution — powers the admin KPI row. */
exports.summarize = async () => {
    const [row] = await Review.aggregate([
        {
            $group: {
                _id: null,
                total:    { $sum: 1 },
                pending:  { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
                rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                avgStars: { $avg: { $cond: [{ $eq: ['$status', 'approved'] }, '$stars', '$$REMOVE'] } },
                star5: { $sum: { $cond: [{ $eq: ['$stars', 5] }, 1, 0] } },
                star4: { $sum: { $cond: [{ $eq: ['$stars', 4] }, 1, 0] } },
                star3: { $sum: { $cond: [{ $eq: ['$stars', 3] }, 1, 0] } },
                star2: { $sum: { $cond: [{ $eq: ['$stars', 2] }, 1, 0] } },
                star1: { $sum: { $cond: [{ $eq: ['$stars', 1] }, 1, 0] } },
            },
        },
    ]);

    if (!row) {
        return {
            total: 0, pending: 0, approved: 0, rejected: 0, avgStars: 0,
            distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        };
    }

    return {
        total: row.total,
        pending: row.pending,
        approved: row.approved,
        rejected: row.rejected,
        avgStars: Math.round((row.avgStars || 0) * 10) / 10,
        distribution: { 5: row.star5, 4: row.star4, 3: row.star3, 2: row.star2, 1: row.star1 },
    };
};

/**
 * Paginated queue for the dashboard. Each review that carries a phone gets
 * enriched with that client's visit stats (citas / top service) pulled from
 * the same aggregate the Clientes directory uses — context a barber needs to
 * tell a first-timer's gripe apart from a regular's.
 */
exports.list = async (opts = {}) => {
    const filter = buildFilter(opts);
    const sort   = SORTS[opts.orden] || SORTS.recientes;

    const limit = clampInt(opts.limit, PAGE_SIZE, 1, PAGE_MAX);
    const total = await Review.countDocuments(filter);
    const pages = Math.max(1, Math.ceil(total / limit));
    const page  = clampInt(opts.page, 1, 1, pages);
    const skip  = (page - 1) * limit;

    const [rows, summary, statsByPhone] = await Promise.all([
        Review.find(filter).sort(sort).skip(skip).limit(limit).lean(),
        exports.summarize(),
        Directory.statsByPhone(),
    ]);

    const data = rows.map(r => {
        const stats = r.phone ? statsByPhone.get(String(r.phone)) : null;
        return {
            ...r,
            clientStats: stats ? { citas: stats.citas, topServicio: stats.topServicio } : null,
        };
    });

    return { data, total, page, limit, pages, summary };
};

// ─── mutations ────────────────────────────────────────────────────────────────

exports.findById = async (id) => {
    if (!mongoose.isValidObjectId(id)) throw new ReviewError('Reseña no encontrada.', 404);
    const doc = await Review.findById(id);
    if (!doc) throw new ReviewError('Reseña no encontrada.', 404);
    return doc;
};

exports.setStatus = async (id, status) => {
    if (!STATUSES.has(status)) throw new ReviewError('Estado inválido.');
    const doc = await exports.findById(id);
    doc.status = status;
    doc.reviewedAt = new Date();
    await doc.save();
    return doc;
};

exports.reply = async (id, reply) => {
    const doc = await exports.findById(id);
    doc.reply = String(reply || '').trim().slice(0, 400);
    doc.repliedAt = doc.reply ? new Date() : null;
    await doc.save();
    return doc;
};

exports.remove = async (id) => {
    const doc = await exports.findById(id);
    await Review.deleteOne({ _id: doc._id });
    return { deleted: true };
};

exports.ReviewError = ReviewError;
