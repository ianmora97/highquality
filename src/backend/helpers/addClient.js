const Client = require('../models/clients/client.model');

/**
 * Read-only lookup by phone. Returns null when the number is unknown.
 * Used to resolve the canonical name BEFORE the cita is created, so a booking
 * that loses the slot race does not leave a client record behind.
 */
async function findClient(numero) {
    if (numero === undefined || numero === null || numero === '') return null;
    return Client.findOne(numero);
}

/**
 * Persist the client if it does not exist yet. Call this only once the cita it
 * belongs to has actually been created.
 * `existing` is the result of findClient(), passed in to avoid a second query.
 */
async function ensureClient({ numero, nombre }, existing) {
    if (existing) return existing;
    try {
        return await Client.create({ numero, nombre });
    } catch (err) {
        // Two bookings for a brand-new number can reach this at the same time;
        // the unique index on `numero` picks a winner, so just read it back.
        if (err && err.code === 11000) return findClient(numero);
        throw err;
    }
}

/**
 * Lookup-or-create in one call. Kept for callers that create the client first
 * on purpose (the admin panel, where the cita cannot lose a race it owns).
 */
async function addClient(data) {
    const numero   = data.extendedProps.numero;
    const existing = await findClient(numero);
    return ensureClient({ numero, nombre: data.title }, existing);
}

function addOneCitaPaga(data) {
    return Client.addOneCitaPaga(parseInt(data.extendedProps.numero));
}

module.exports = {
    addClient,
    findClient,
    ensureClient,
    addOneCitaPaga,
};
