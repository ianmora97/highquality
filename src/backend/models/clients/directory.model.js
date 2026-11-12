/* Client directory — the one place that answers "who are our clients?".
 *
 * Clients live in two collections for historical reasons:
 *   • users   — the unified account model (role `client`), created on register
 *   • clients — the legacy record the booking flow still writes by phone
 * and their history lives in `events`, keyed by `extendedProps.numero`.
 *
 * This module merges the three by phone number so the dashboard — and anything
 * else that needs a client — sees a single normalized shape:
 *
 *   { _id, source, name/nombre, phone/numero, email, hasAccount, active,
 *     citas, citasPagas, totalGastado, primeraVisita, ultimaVisita,
 *     topServicio, createdAt }
 *
 * `nombre` / `numero` are kept alongside `name` / `phone` because the admin
 * panel and the booking page still read the legacy names.
 */

const mongoose = require('mongoose');

const Client  = require('./client.schema');
const User    = require('../user/user.schema');
const UserRol = require('../userRol/userRol.schema');
const Rol     = require('../rol/rol.schema');
const Event   = require('../events/event.schema');
const Session = require('../session/session.schema');

const { hash } = require('../../helpers/password');

// The placeholder number the panel uses for "Cerrado" blocks — never a client.
const SENTINEL_PHONE = '88008800';

// Directory list: default page size and hard ceiling (a caller can't ask for
// the whole production table in one request).
const LIST_PAGE_SIZE = 24;
const LIST_PAGE_MAX  = 100;

// Citas history: same idea, smaller page — this renders inside a bottom sheet.
const HISTORY_PAGE_SIZE = 15;
const HISTORY_PAGE_MAX  = 50;

// A client can rack up 100+ citas a year; "frecuente" just needs a low bar.
const VIP_CITAS = 5;

// ─── helpers ──────────────────────────────────────────────────────────────────

function digits(value) {
    return String(value ?? '').replace(/\D/g, '');
}

function clampInt(value, fallback, min, max) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}

function isValidPhone(value) {
    return digits(value).length === 8;
}

function toPhoneNumber(value) {
    const d = digits(value);
    return d ? parseInt(d, 10) : null;
}

function titleCase(str) {
    return String(str || '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .replace(/(^|\s|-)([\p{L}])/gu, (_m, sep, ch) => sep + ch.toUpperCase());
}

class DirectoryError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// ─── event stats, per phone ───────────────────────────────────────────────────

/**
 * One pass over `events` → citas, pagadas, money and dates for every phone.
 * Returns Map<phoneString, stats>.
 */
async function statsByPhone() {
    const rows = await Event.aggregate([
        // Filter on the raw, indexed field first (idx_event_numero_start) so
        // this can use the index instead of scanning every cita to compute a
        // throwaway string — matters once the collection is in the thousands.
        {
            $match: {
                'extendedProps.numero': { $exists: true, $nin: ['', null, SENTINEL_PHONE, Number(SENTINEL_PHONE)] },
                'extendedProps.servicios': { $ne: 'Cerrado' },
            },
        },
        {
            $addFields: {
                _phone:     { $toString: '$extendedProps.numero' },
                _servicios: { $ifNull: ['$extendedProps.servicios', []] },
            },
        },
        {
            $addFields: {
                _pago:   { $eq: ['$extendedProps.estado', 'PAGO'] },
                _precio: { $convert: { input: '$extendedProps.precio', to: 'double', onError: 0, onNull: 0 } },
            },
        },
        {
            $group: {
                _id:           '$_phone',
                citas:         { $sum: 1 },
                citasPagas:    { $sum: { $cond: ['$_pago', 1, 0] } },
                totalGastado:  { $sum: { $cond: ['$_pago', '$_precio', 0] } },
                primeraVisita: { $min: '$start' },
                ultimaVisita:  { $max: '$start' },
                servicios:     { $push: '$_servicios' },
            },
        },
    ]);

    const map = new Map();
    for (const row of rows) {
        const counts = new Map();
        for (const list of row.servicios || []) {
            for (const s of Array.isArray(list) ? list : [list]) {
                // Old citas carry stray one-character entries — not a service.
                const name = String(s || '').trim();
                if (name.length < 2) continue;
                counts.set(name, (counts.get(name) || 0) + 1);
            }
        }
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

        map.set(row._id, {
            citas:         row.citas,
            citasPagas:    row.citasPagas,
            totalGastado:  Math.round(row.totalGastado || 0),
            primeraVisita: row.primeraVisita || null,
            ultimaVisita:  row.ultimaVisita || null,
            topServicio:   top ? top[0] : '',
        });
    }
    return map;
}

// ─── who counts as a client ───────────────────────────────────────────────────

/** Ids of users holding a staff role (admin / su) — excluded from the directory. */
async function staffUserIds() {
    const staffRols = await Rol.find({ level: { $gte: 2 } }).select('_id').lean();
    if (!staffRols.length) return new Set();
    const links = await UserRol
        .find({ rol: { $in: staffRols.map(r => r._id) } })
        .select('user')
        .lean();
    return new Set(links.map(l => String(l.user)));
}

function normalize({ user, legacy, stats }) {
    const phone = user?.phone ?? legacy?.numero ?? null;
    const empty = { citas: 0, citasPagas: 0, totalGastado: 0, primeraVisita: null, ultimaVisita: null, topServicio: '' };
    const s = stats || empty;

    // The legacy counter is only a fallback: the events collection is the truth.
    const citasPagas = s.citas ? s.citasPagas : (legacy?.citasPagas || user?.citasPagas || 0);
    const name       = user?.name || legacy?.nombre || '';

    return {
        _id:      String(user?._id || legacy?._id),
        source:   user ? 'user' : 'legacy',
        userId:   user ? String(user._id) : null,
        legacyId: legacy ? String(legacy._id) : null,

        name,
        nombre: name,                      // legacy field name
        phone,
        numero: phone,                     // legacy field name
        email:  user?.email || '',

        hasAccount: !!(user && user.password),
        active:     user ? user.active !== false : true,
        provider:   user?.provider || null,

        citas:         s.citas,
        citasPagas,
        totalGastado:  s.totalGastado,
        primeraVisita: s.primeraVisita,
        ultimaVisita:  s.ultimaVisita,
        topServicio:   s.topServicio,

        createdAt: user?.createdAt || legacy?.createdAt || null,
        updatedAt: user?.updatedAt || null,
    };
}

/**
 * Merge users + legacy clients + event stats into one sorted array. This is
 * the expensive part (one aggregate over `events`, one scan of `users` +
 * `clients`) but it's O(clients), not O(citas) beyond the single grouped
 * aggregate — cheap even at a few hundred clients. Search/filter/sort/paging
 * all happen on this in-memory array in `list()` below, which is where a
 * caller controls how much of it actually gets serialized over the wire.
 */
async function mergeAll() {
    const [users, legacies, stats, staff] = await Promise.all([
        User.find().select('+password').lean(),
        Client.find().lean(),
        statsByPhone(),
        staffUserIds(),
    ]);

    const byPhone = new Map();   // phoneString → { user, legacy }

    for (const user of users) {
        if (staff.has(String(user._id))) continue;
        const key = digits(user.phone);
        if (!key) continue;      // account with no phone — not a booking client
        byPhone.set(key, { user, legacy: null });
    }

    for (const legacy of legacies) {
        const key = digits(legacy.numero);
        if (!key || key === SENTINEL_PHONE) continue;
        const entry = byPhone.get(key);
        if (entry) entry.legacy = legacy;
        else byPhone.set(key, { user: null, legacy });
    }

    const out = [];
    for (const [key, entry] of byPhone) {
        out.push(normalize({ ...entry, stats: stats.get(key) }));
    }

    return out.sort((a, b) => {
        const ta = a.ultimaVisita ? new Date(a.ultimaVisita).getTime() : 0;
        const tb = b.ultimaVisita ? new Date(b.ultimaVisita).getTime() : 0;
        if (tb !== ta) return tb - ta;
        return String(a.name).localeCompare(String(b.name), 'es');
    });
}

function summarize(all) {
    return {
        total:      all.length,
        conCuenta:  all.reduce((n, c) => n + (c.hasAccount ? 1 : 0), 0),
        recurrentes: all.reduce((n, c) => n + ((c.citas || 0) >= 2 ? 1 : 0), 0),
        ingresos:   all.reduce((n, c) => n + (c.totalGastado || 0), 0),
    };
}

function applySearch(all, search) {
    const q = String(search || '').trim().toLowerCase();
    if (!q) return all;
    const qDigits = q.replace(/\D/g, '');
    return all.filter(c =>
        String(c.name || '').toLowerCase().includes(q)
        || String(c.email || '').toLowerCase().includes(q)
        || (qDigits && String(c.phone || '').includes(qDigits))
    );
}

function applyFiltro(all, filtro) {
    switch (filtro) {
        case 'cuenta':    return all.filter(c => c.hasAccount);
        case 'sincuenta': return all.filter(c => !c.hasAccount);
        case 'vip':       return all.filter(c => (c.citas || 0) >= VIP_CITAS);
        default:          return all;
    }
}

function applyOrden(all, orden) {
    const ts = v => (v ? new Date(v).getTime() : 0);
    const sorted = all.slice();
    switch (orden) {
        case 'citas':  return sorted.sort((a, b) => (b.citas || 0) - (a.citas || 0));
        case 'gasto':  return sorted.sort((a, b) => (b.totalGastado || 0) - (a.totalGastado || 0));
        case 'nombre': return sorted.sort((a, b) => String(a.name).localeCompare(String(b.name), 'es'));
        case 'nuevos': return sorted.sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
        default:       return sorted; // already ultimaVisita desc from mergeAll()
    }
}

/**
 * Every client, with their stats merged in.
 *
 * Called with no options, this keeps its original contract — the full array,
 * unpaginated — because `admin/index.js` needs the complete directory client
 * side to match phones while booking. Passed `page`/`limit`/`search`/`filtro`
 * /`orden`, it instead returns a paginated envelope: only the requested slice
 * is serialized, so the Clientes dashboard never ships hundreds of client
 * records (and their stats) for a page that renders 24 cards.
 */
async function list(opts = {}) {
    const all = await mergeAll();

    const paginating = opts.page !== undefined || opts.limit !== undefined
        || opts.search || (opts.filtro && opts.filtro !== 'todos') || opts.orden;
    if (!paginating) return all;

    const summary = summarize(all);
    let filtered = applySearch(all, opts.search);
    filtered = applyFiltro(filtered, opts.filtro);
    filtered = applyOrden(filtered, opts.orden);

    const limit = clampInt(opts.limit, LIST_PAGE_SIZE, 1, LIST_PAGE_MAX);
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const page  = clampInt(opts.page, 1, 1, pages);
    const skip  = (page - 1) * limit;

    return { data: filtered.slice(skip, skip + limit), total, page, limit, pages, summary };
}

// ─── single client ────────────────────────────────────────────────────────────

/** Resolve one directory id (user id OR legacy client id) to both records. */
async function resolve(id) {
    if (!mongoose.isValidObjectId(id)) throw new DirectoryError('Cliente no encontrado.', 404);

    let user   = await User.findById(id).select('+password');
    let legacy = user ? null : await Client.findById(id);

    if (!user && !legacy) throw new DirectoryError('Cliente no encontrado.', 404);

    const phone = digits(user?.phone ?? legacy?.numero);
    if (phone) {
        const n = parseInt(phone, 10);
        if (!user)   user   = await User.findOne({ phone: n }).select('+password');
        if (!legacy) legacy = await Client.findOne({ numero: n });
    }
    return { user, legacy, phone };
}

/**
 * The client's citas, newest first, paginated. `idx_event_numero_start`
 * (see connections/indexes.js) makes both the count and the sorted
 * skip/limit cheap regardless of how many citas the client has piled up.
 */
async function history(phone, opts = {}) {
    const limit = clampInt(opts.limit, HISTORY_PAGE_SIZE, 1, HISTORY_PAGE_MAX);
    const key   = digits(phone);
    if (!key) return { data: [], total: 0, page: 1, limit, pages: 1 };

    const filter = { 'extendedProps.numero': { $in: [key, parseInt(key, 10)] } };
    const total  = await Event.countDocuments(filter);
    const pages  = Math.max(1, Math.ceil(total / limit));
    const page   = clampInt(opts.page, 1, 1, pages);
    const skip   = (page - 1) * limit;

    const data = await Event.find(filter)
        .sort({ start: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    return { data, total, page, limit, pages };
}

/** Resolve a directory id straight to its phone — no stats aggregate needed. */
async function phoneFor(id) {
    const { phone } = await resolve(id);
    if (!phone) throw new DirectoryError('Cliente no encontrado.', 404);
    return phone;
}

async function findOne(id) {
    const { user, legacy, phone } = await resolve(id);
    const stats  = await statsByPhone();
    const client = normalize({
        user:   user ? user.toObject() : null,
        legacy: legacy ? legacy.toObject() : null,
        stats:  stats.get(phone),
    });
    client.citasRecientes = (await history(phone, { limit: 20 })).data;
    return client;
}

// ─── mutations ────────────────────────────────────────────────────────────────

/** Reject a phone that already belongs to somebody else. */
async function assertPhoneFree(phone, { userId, legacyId } = {}) {
    const n = toPhoneNumber(phone);

    const user = await User.findOne({ phone: n }).select('_id').lean();
    if (user && String(user._id) !== String(userId || '')) {
        throw new DirectoryError('Ya existe un cliente con ese número.', 409);
    }
    const legacy = await Client.findOne({ numero: n }).select('_id').lean();
    if (legacy && String(legacy._id) !== String(legacyId || '')) {
        throw new DirectoryError('Ya existe un cliente con ese número.', 409);
    }
}

/**
 * The `client` role id. It only has to exist when the client can actually log
 * in: an admin-created contact without a password needs no role row, so a
 * database that never ran `npm run auth:seed` still works for plain contacts.
 */
async function clientRolId(required) {
    const rol = await Rol.findOne({ name: 'client' }).select('_id').lean();
    if (!rol && required) {
        throw new DirectoryError('Falta el rol de cliente. Ejecuta npm run auth:seed.', 500);
    }
    return rol ? rol._id : null;
}

/** Give the user the client role, unless it already has one. */
async function ensureRol(userId, required) {
    const link = await UserRol.findOne({ user: userId });
    if (link) return;
    const rol = await clientRolId(required);
    if (rol) await UserRol.create({ user: userId, rol });
}

/**
 * Keep past citas pointing at the client after a rename / renumber, so the
 * calendar and the stats above never lose the history.
 */
async function rewriteHistory({ oldPhone, newPhone, oldName, newName }) {
    const from = digits(oldPhone);
    if (!from) return;

    const set = {};
    if (newPhone && digits(newPhone) !== from) set['extendedProps.numero'] = digits(newPhone);
    if (newName && newName !== oldName)        set.title = newName;
    if (!Object.keys(set).length) return;

    set.updatedAt = new Date();
    await Event.updateMany(
        { 'extendedProps.numero': { $in: [from, parseInt(from, 10)] } },
        { $set: set }
    );
}

/**
 * Create a client. Writes both records: the `User` account (so the rest of the
 * site sees them and they can log in later) and the legacy `Client` row the
 * booking flow still reads. The password is optional — without one the account
 * exists but cannot log in until one is set.
 */
async function create(body = {}) {
    const name  = titleCase(body.name ?? body.nombre);
    const phone = body.phone ?? body.numero;

    if (!name) throw new DirectoryError('Escribe el nombre del cliente.');
    if (!isValidPhone(phone)) throw new DirectoryError('El teléfono debe tener 8 dígitos.');

    const password = body.password ? String(body.password) : '';
    if (password && password.length < 8) {
        throw new DirectoryError('La contraseña debe tener al menos 8 caracteres.');
    }

    await assertPhoneFree(phone);

    const n    = toPhoneNumber(phone);
    const user = await User.create({
        name,
        phone:    n,
        password: password ? await hash(password) : '',
        provider: 'local',
    });
    await ensureRol(user._id, !!password);

    const legacy = await Client.create({ nombre: name, numero: n });

    return normalize({ user: user.toObject(), legacy: legacy.toObject(), stats: null });
}

/**
 * Update name / phone / password. Works whether the client started as a legacy
 * record or as an account, and upgrades a legacy-only client to a real account
 * as soon as a password is set.
 */
async function update(id, body = {}) {
    const { user, legacy, phone: oldPhone } = await resolve(id);

    const oldName = user?.name || legacy?.nombre || '';
    const name    = (body.name !== undefined || body.nombre !== undefined)
        ? titleCase(body.name ?? body.nombre)
        : oldName;

    const phoneIn  = body.phone ?? body.numero;
    const newPhone = (phoneIn !== undefined && phoneIn !== null && phoneIn !== '')
        ? digits(phoneIn)
        : oldPhone;

    if (!name) throw new DirectoryError('Escribe el nombre del cliente.');
    if (!isValidPhone(newPhone)) throw new DirectoryError('El teléfono debe tener 8 dígitos.');

    const password = body.password ? String(body.password) : '';
    if (password && password.length < 8) {
        throw new DirectoryError('La contraseña debe tener al menos 8 caracteres.');
    }

    if (newPhone !== oldPhone) {
        await assertPhoneFree(newPhone, { userId: user?._id, legacyId: legacy?._id });
    }

    const n = parseInt(newPhone, 10);
    let currentUser = user;

    if (currentUser) {
        currentUser.name  = name;
        currentUser.phone = n;
        if (body.active !== undefined) currentUser.active = !!body.active;
        if (password) currentUser.password = await hash(password);
        await currentUser.save();
    } else if (password) {
        // Legacy-only client gaining an account.
        currentUser = await User.create({
            name,
            phone:    n,
            password: await hash(password),
            provider: 'local',
        });
    }

    // The role row can be missing on accounts created before unified auth.
    if (currentUser) await ensureRol(currentUser._id, !!password);

    if (legacy) {
        legacy.nombre = name;
        legacy.numero = n;
        await legacy.save();
    } else if (currentUser) {
        // Keep the booking flow's lookup table in sync.
        const exists = await Client.findOne({ numero: n });
        if (!exists) await Client.create({ nombre: name, numero: n });
    }

    // A new password must not leave the old session alive.
    if (password && currentUser) await Session.deleteOne({ user: currentUser._id });

    await rewriteHistory({ oldPhone, newPhone, oldName, newName: name });

    const stats = await statsByPhone();
    return normalize({
        user:   currentUser ? currentUser.toObject() : null,
        legacy: legacy ? legacy.toObject() : null,
        stats:  stats.get(newPhone),
    });
}

/** Revoke the login but keep the client (and their history) in the directory. */
async function removeAccount(id) {
    const { user } = await resolve(id);
    if (!user || !user.password) throw new DirectoryError('Este cliente no tiene cuenta.', 400);

    user.password = '';
    await user.save();
    await Session.deleteOne({ user: user._id });

    return findOne(String(user._id));
}

/** Delete the client everywhere. Citas are left untouched on purpose. */
async function remove(id) {
    const { user, legacy, phone } = await resolve(id);

    if (user) {
        await Promise.all([
            UserRol.deleteOne({ user: user._id }),
            Session.deleteOne({ user: user._id }),
            User.deleteOne({ _id: user._id }),
        ]);
    }
    if (legacy) await Client.deleteOne({ _id: legacy._id });

    return { deleted: true, phone };
}

module.exports = {
    DirectoryError,
    list,
    findOne,
    history,
    phoneFor,
    create,
    update,
    removeAccount,
    remove,
    statsByPhone,
    titleCase,
    digits,
    isValidPhone,
};
