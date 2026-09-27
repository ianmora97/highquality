const Event = require('../models/events/event.model');
const { findClient, ensureClient, addOneCitaPaga } = require('../helpers/addClient');
const { sendWhatsappMessage }       = require('../helpers/whatsapp');
const { sendTelegramMessage }       = require('../helpers/telegram');
const Setting                       = require('../models/setting/setting.schema');
const { createEvents }              = require('ics');
const realtime                      = require('../helpers/realtime');
const moment = require('moment-timezone');

const DUPLICATE_KEY = 11000;

// The unique index on events.start is what actually stops two clients from
// booking the same slot; whoever loses the race lands here.
function isSlotTaken(err) {
    return err && (err.code === DUPLICATE_KEY || err?.cause?.code === DUPLICATE_KEY);
}

exports.get = async (req, res) => {
    const limit  = req.query?.limit  || null;
    const page   = req.query?.page   || null;
    const sort   = req.query?.sort   || 'createdAt';
    const only   = req.query?.onlyThisDay || null;
    const events = await Event.get(limit, page, sort, only);
    res.json(events);
};

exports.getIcs = async (req, res) => {
    try {
        const events = await Event.get(null, null, 'thisweek', null);
        const eventosICS = events.map(event => {
            const start = getDateArray(new Date(event.start));
            const end   = getDateArray(new Date(event.end));
            return {
                start,
                end,
                title:       `💈 Cita: ${event.title}`,
                description: `✂️ Servicios: ${event.extendedProps.servicios.join(', ')}\n📞 Tel: ${event.extendedProps.numero}`,
                location:    '📍 HighQuality Studio',
                uid:         event._id.toString(),
            };
        });
        const { error, value } = createEvents(eventosICS);
        if (error) throw error;
        res.setHeader('Content-Type', 'text/calendar');
        res.setHeader('Content-Disposition', 'inline; filename=calendar.ics');
        res.send(value);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generando el calendario');
    }
};

exports.getMonth = async (req, res) => {
    const month  = req.query?.month || null;
    const events = await Event.getMonth(month);
    res.json(events);
};

exports.getRange = async (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end are required' });
    const events = await Event.getRange(start, end);
    res.json(events);
};

// Admin-created citas (and "Cerrado" blocks).
exports.create = async (req, res, next) => {
    const esCerrado = req.body.title === 'Cerrado';
    const numero    = req.body.extendedProps?.numero;
    try {
        // Same rule as the client path: resolve the name with a read, and only
        // write the client once the cita has actually been created.
        const existing = esCerrado ? null : await findClient(numero);
        if (existing) req.body.title = existing.nombre;

        const event = await Event.create(req.body);

        if (!esCerrado) await ensureClient({ numero, nombre: req.body.title }, existing);

        realtime.citaCreated(event, 'admin');
        res.json(event);
    } catch (err) {
        if (isSlotTaken(err)) {
            return res.status(409).json({ error: 'Ese horario ya está ocupado.' });
        }
        next(err);
    }
};

// Client bookings — already validated by validateBooking + validateSlot.
exports.createClient = async (req, res, next) => {
    const numero = req.body.extendedProps.numero;
    try {
        // Look the client up without writing: a booking that loses the slot race
        // must not leave a client record behind.
        const existing = await findClient(numero);
        if (existing) req.body.title = existing.nombre;

        const event = await Event.create(req.body);

        // The cita exists — now the client is worth persisting.
        await ensureClient({ numero, nombre: req.body.title }, existing);

        realtime.citaCreated(event, 'client');

        // Notifications must never fail the booking that already happened.
        try {
            const setting = await Setting.getSingleton();
            if (setting.whatsappConfirmEnabled) await sendWhatsappMessage(req.body);
        } catch (notifyErr) {
            console.error('[event.createClient] notificación falló', notifyErr.message);
        }

        res.json(event);
    } catch (err) {
        if (isSlotTaken(err)) {
            return res.status(409).json({ error: 'Esa hora acaba de ser reservada. Elige otra.' });
        }
        next(err);
    }
};

exports.update = async (req, res, next) => {
    const { id } = req.params;
    try {
        const event = await Event.update(id, req.body);
        if (!event) return res.status(404).json({ error: 'Cita no encontrada.' });
        realtime.citaUpdated(event, 'reagendada');
        res.json(event);
    } catch (err) {
        if (isSlotTaken(err)) {
            return res.status(409).json({ error: 'Ese horario ya está ocupado.' });
        }
        next(err);
    }
};

exports.delete = async (req, res) => {
    const { id } = req.params;
    const event  = await Event.delete(id);
    if (!event) return res.status(404).json({ error: 'Cita no encontrada.' });
    realtime.citaDeleted(event);
    res.json(event);
};

exports.pagar = async (req, res) => {
    const { id }  = req.params;
    const monto   = req.body.monto;
    const event   = await Event.pagar(id, monto);
    if (!event) return res.status(404).json({ error: 'Cita no encontrada.' });
    await addOneCitaPaga(event);
    realtime.citaUpdated(event, 'pago');
    res.json(event);
};

exports.pagarHoy = async (req, res) => {
    const events = await Event.pagarTodasHoy();
    for (const event of events) {
        await addOneCitaPaga(event);
        realtime.citaUpdated(event, 'pago');
    }
    res.json({ actualizadas: events.length });
};

exports.getByClient = async (req, res) => {
    // req.user.phone is the phone number from the JWT (new auth)
    const phone = req.user?.phone ?? req.client?.numero;
    if (!phone) return res.json([]);
    const EventSchema = require('../models/events/event.schema');
    const events = await EventSchema
        .find({ 'extendedProps.numero': String(phone) })
        .sort({ start: -1 })
        .limit(50)
        .lean();
    res.json(events);
};

function getDateArray(dateStr) {
    const local = moment.tz(dateStr, 'America/Costa_Rica');
    return [local.year(), local.month() + 1, local.date(), local.hour(), local.minute()];
}
