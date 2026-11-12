const Directory = require('../models/clients/directory.model');
const Client    = require('../models/clients/client.model');
const User      = require('../models/user/user.schema');

const { DirectoryError } = Directory;

/** Turn a DirectoryError into its JSON response; rethrow anything unexpected. */
function fail(res, err) {
    if (err instanceof DirectoryError) {
        return res.status(err.status).json({ error: err.message });
    }
    if (err && err.code === 11000) {
        return res.status(409).json({ error: 'Ya existe un cliente con ese número.' });
    }
    throw err;
}

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

const ORDENES = new Set(['recientes', 'citas', 'gasto', 'nombre', 'nuevos']);
const FILTROS = new Set(['todos', 'cuenta', 'sincuenta', 'vip']);

// GET /api/v1/client — unified directory (users + legacy clients + event stats)
//
// No `page` param → the original contract: the full unpaginated array, kept
// so admin/index.js's booking flow (which needs the whole directory client
// side to match phones) never changes. Pass `page` (as the Clientes dashboard
// does) to get back a { data, total, page, pages, summary } envelope instead —
// only that page's clients are serialized.
exports.get = async (req, res) => {
    const { page, limit, search, filtro, orden } = req.query;
    if (page === undefined) {
        return res.json(await Directory.list());
    }
    res.json(await Directory.list({
        page,
        limit,
        search: (search || '').toString().slice(0, 80),
        filtro: FILTROS.has(filtro) ? filtro : 'todos',
        orden:  ORDENES.has(orden) ? orden : 'recientes',
    }));
};

// GET /api/v1/client/:id — one client plus their most recent citas
exports.getOne = async (req, res) => {
    try {
        res.json(await Directory.findOne(req.params.id));
    } catch (err) { return fail(res, err); }
};

// GET /api/v1/client/:id/citas — paginated, newest first
exports.getHistory = async (req, res) => {
    try {
        const phone = await Directory.phoneFor(req.params.id);
        res.json(await Directory.history(phone, { page: req.query.page, limit: req.query.limit }));
    } catch (err) { return fail(res, err); }
};

exports.create = async (req, res) => {
    try {
        res.json(await Directory.create(req.body));
    } catch (err) { return fail(res, err); }
};

exports.update = async (req, res) => {
    try {
        res.json(await Directory.update(req.params.id, req.body));
    } catch (err) { return fail(res, err); }
};

// DELETE /api/v1/client/:id/account — revoke the login, keep the client
exports.deleteAccount = async (req, res) => {
    try {
        res.json(await Directory.removeAccount(req.params.id));
    } catch (err) { return fail(res, err); }
};

exports.delete = async (req, res) => {
    try {
        res.json(await Directory.remove(req.params.id));
    } catch (err) { return fail(res, err); }
};

// ─── Booking phone lookup ─────────────────────────────────────────────────────
// Used by reserva.js to pre-fill name + show auth buttons when a phone is recognized
exports.lookup = async (req, res) => {
    const { numero } = req.query;
    if (!numero) return res.json({ found: false });

    const phone = Directory.digits(numero);
    if (!phone) return res.json({ found: false });

    // Check both sources in parallel
    const [user, client] = await Promise.all([
        User.findOne({ phone: parseInt(phone, 10) }).select('+password'),
        Client.findByPhone(phone),
    ]);

    if (!user && !client) return res.json({ found: false });

    return res.json({
        found:      true,
        nombre:     user?.name || client?.nombre || '',
        hasAccount: !!(user && user.password),
    });
};
