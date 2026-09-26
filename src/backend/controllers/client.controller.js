const Client = require('../models/clients/client.model');
const User   = require('../models/user/user.schema');

// ─── Admin CRUD ───────────────────────────────────────────────────────────────
exports.get = async (req, res) => {
    const clients = await Client.get();
    res.json(clients);
};

exports.create = async (req, res) => {
    const client = await Client.create(req.body);
    res.json(client);
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const client  = await Client.update(id, req.body);
    res.json(client);
};

exports.delete = async (req, res) => {
    const { id } = req.params;
    const client  = await Client.delete(id);
    res.json(client);
};

// ─── Booking phone lookup ─────────────────────────────────────────────────────
// Used by reserva.js to pre-fill name + show auth buttons when a phone is recognized
exports.lookup = async (req, res) => {
    const { numero } = req.query;
    if (!numero) return res.json({ found: false });

    // Check both sources in parallel
    const [user, client] = await Promise.all([
        User.findOne({ phone: parseInt(numero) }),
        Client.findByPhone(numero),
    ]);

    if (!user && !client) return res.json({ found: false });

    return res.json({
        found:      true,
        nombre:     user?.name || client?.nombre || '',
        hasAccount: !!user,
    });
};
