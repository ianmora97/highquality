// Two clients can pass `validateSlot` at the same instant, so the last line of
// defence against double booking is a unique index on `events.start`: whoever
// inserts first wins, the loser gets E11000 and a 409.
//
// The index is created at runtime (not declared on the schema) so an existing
// database with duplicate starts gets a loud warning instead of a silent
// autoIndex failure.

const mongoose = require('mongoose');

async function ensureEventStartIndex() {
    // Raw driver collection: the mongoose wrapper buffers and does not return a cursor.
    const col = mongoose.connection.db.collection('events');

    const dupes = await col.aggregate([
        { $group: { _id: '$start', n: { $sum: 1 } } },
        { $match: { n: { $gt: 1 } } },
        { $sort: { _id: 1 } },
    ]).toArray();

    if (dupes.length) {
        console.warn(
            `[WARN] events.start has ${dupes.length} duplicated slot(s) — unique index NOT created.\n` +
            '       Double booking stays possible until they are cleaned up:\n' +
            dupes.map(d => `       · ${new Date(d._id).toISOString()} (${d.n} citas)`).join('\n')
        );
        return false;
    }

    await col.createIndex({ start: 1 }, { unique: true, name: 'uniq_event_start' });
    console.log('[OK] events.start unique index ready');
    return true;
}

// Every client-directory request (the dashboard's Clientes tab, the citas
// history it pages through, and the per-client aggregate rollup) filters or
// groups on `extendedProps.numero` and sorts on `start`. Without this index
// each of those is a full collection scan — fine at a few hundred citas, not
// at the thousands this site accumulates over a year of weekly bookings.
async function ensureClientHistoryIndex() {
    const col = mongoose.connection.db.collection('events');
    await col.createIndex(
        { 'extendedProps.numero': 1, start: -1 },
        { name: 'idx_event_numero_start' }
    );
    console.log('[OK] events.extendedProps.numero index ready');
}

function ensureIndexes() {
    const run = () => {
        ensureEventStartIndex().catch(err =>
            console.warn('[WARN] could not ensure events.start index:', err.message)
        );
        ensureClientHistoryIndex().catch(err =>
            console.warn('[WARN] could not ensure events.extendedProps.numero index:', err.message)
        );
    };

    if (mongoose.connection.readyState === 1) run();
    else mongoose.connection.once('connected', run);
}

module.exports = { ensureIndexes, ensureEventStartIndex, ensureClientHistoryIndex };
