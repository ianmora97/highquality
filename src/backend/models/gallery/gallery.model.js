const Gallery = require('./gallery.schema');
const { normalizeUrl, keyFromUrl } = require('../../helpers/storage');

// Rows written before the public-URL fix hold a /storage/v1/s3/ link, which
// answers 403 to an <img>. Repair it on read so old photos keep rendering
// without a migration.
function hydrate(doc) {
    if (!doc) return doc;
    doc.imageUrl = normalizeUrl(doc.imageUrl);
    if (!doc.imageKey) doc.imageKey = keyFromUrl(doc.imageUrl);
    return doc;
}

/** Ordered list. `visible: true` is what the public gallery asks for. */
exports.get = async ({ visible = null, limit = 0 } = {}) => {
    const where = visible === null ? {} : { visible: !!visible };
    const q = Gallery.find(where).sort({ order: 1, createdAt: -1 });
    if (limit > 0) q.limit(limit);
    const rows = await q.lean();
    return rows.map(hydrate);
};

exports.getById = async (id) => hydrate(await Gallery.findById(id).lean());

exports.create = async (data) => {
    // New photos land first so the barber sees the upload without scrolling.
    const first = await Gallery.findOne().sort({ order: 1 }).select('order').lean();
    const order = first ? (first.order || 0) - 1 : 0;
    const g = new Gallery({ ...data, order });
    await g.save();
    return hydrate(g.toObject());
};

const EDITABLE = ['title', 'description', 'instagramLink', 'visible', 'order'];

exports.update = async (id, data) => {
    const patch = { updatedAt: new Date() };
    for (const k of EDITABLE) if (data[k] !== undefined) patch[k] = data[k];
    return hydrate(await Gallery.findByIdAndUpdate(id, patch, { new: true, lean: true }));
};

/** Persist a drag-reorder: ids in the order they should render. */
exports.reorder = async (ids) => {
    if (!Array.isArray(ids) || !ids.length) return 0;
    const ops = ids.map((id, i) => ({
        updateOne: { filter: { _id: id }, update: { $set: { order: i, updatedAt: new Date() } } },
    }));
    const res = await Gallery.bulkWrite(ops, { ordered: false });
    return res.modifiedCount || 0;
};

exports.delete = async (id) => Gallery.findByIdAndDelete(id);

exports.count = async () => Gallery.countDocuments();
