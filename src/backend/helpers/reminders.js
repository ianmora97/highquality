const Event = require('../models/events/event.schema');
const { notifyRecordatorio } = require('./telegram');

const SLOT_MS = 30 * 60 * 1000; // citas live on the :00 / :30 grid
const LEAD_MS = 10 * 60 * 1000; // aviso 10 min before
const SLACK_MS = 60 * 1000;     // timers can fire a bit off; keeps the :30 / :00 cita inside the window

// Next :20 or :50 (= slot boundary - 10 min), strictly in the future.
// Epoch-aligned, which matches the wall clock because Costa Rica's UTC offset is whole hours.
function msUntilNextTick(now = Date.now()) {
    return (Math.floor((now + LEAD_MS) / SLOT_MS) + 1) * SLOT_MS - LEAD_MS - now;
}

// One indexed range query (events.start). No citas in the window → no message.
async function tick() {
    try {
        const now = Date.now();
        const citas = await Event.find({
            start: { $gt: new Date(now), $lte: new Date(now + LEAD_MS + SLACK_MS) },
            title: { $ne: 'Cerrado' },
            'extendedProps.numero': { $ne: '88008800' },
            'extendedProps.avisada': { $ne: true },
        }).lean();

        for (const cita of citas) {
            // Atomic claim: whoever flips the flag sends; restarts and overlaps never double-send.
            const claim = await Event.updateOne(
                { _id: cita._id, 'extendedProps.avisada': { $ne: true } },
                { $set: { 'extendedProps.avisada': true } }
            );
            if (claim.modifiedCount) await notifyRecordatorio(cita);
        }
    } catch (err) {
        console.error('[reminders] tick falló:', err.message);
    }
}

// No polling: sleep until the next :20/:50, run, repeat. The delay is recomputed
// from the real clock each round, so drift never accumulates.
// shortcut: assumes a single app instance and citas on the 30 min grid; an off-grid
// cita (e.g. 10:15) is missed — switch to a 60 s tick if that ever becomes possible.
function start() {
    const loop = async () => {
        await tick();
        setTimeout(loop, msUntilNextTick());
    };
    tick(); // catch-up for a restart between ticks (e.g. 10:25 for a 10:30 cita)
    setTimeout(loop, msUntilNextTick());
}

module.exports = { start, tick, msUntilNextTick };
