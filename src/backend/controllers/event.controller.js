const Event = require('../models/events/event.model');
const { addClient, addOneCitaPaga } = require('../helpers/addClient');
const { sendWhatsappMessage } = require('../helpers/whatsapp');
const { sendTelegramMessage } = require('../helpers/telegram');
const { createEvents } = require('ics');

exports.get = async (req, res) => {
    const limit = req.query?.limit || null;
    const page = req.query?.page || null;
    const sort = req.query?.sort || 'createdAt';
    const only = req.query?.onlyThisDay || null;

    const events = await Event.get(limit, page, sort, only);
    res.json(events);
};

exports.getIcs = async (req, res) => {
    try {
        // set limit to this month
        const events = await Event.get(null,null,"thisweek",null);
        console.log(events);
        const eventosICS = events.map(event => ({
            start: getDateArray(new Date(event.start)),
            end: getDateArray(new Date(event.end)),
            title: `Cita: ${event.title}`,
            description: `Servicios: ${event.extendedProps.servicios.join(', ')}\nEstado: ${event.extendedProps.estado}\nPrecio: ₡${event.extendedProps.precio}`,
            location: 'HighQuality Studio',
            uid: event._id.toString(),
        }));

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
    const month = req.query?.month || null;
    const events = await Event.getMonth(month);
    res.json(events);
};

exports.create = async (req, res) => {
    if (req.body.title != 'Cerrado') {
        const client = await addClient(req.body);
        req.body.title = client.nombre;
        const event = await Event.create(req.body);
        res.json(event);
    } else {
        const event = await Event.create(req.body);
        await sendTelegramMessage(req.body);
        res.json(event);
    }
};
exports.createClient = async (req, res) => {
    const client = await addClient(req.body);
    req.body.title = client.nombre;
    const event = await Event.create(req.body);
    await sendWhatsappMessage(req.body);
    await sendTelegramMessage(req.body);
    res.json(event);
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const event = await Event.update(id, req.body);
    res.json(event);
};

exports.delete = async (req, res) => {
    const { id } = req.params;
    const event = await Event.delete(id);
    res.json(event);
};

exports.pagar = async (req, res) => {
    const { id } = req.params;
    const monto = req.body.monto;
    const event = await Event.pagar(id, monto);
    await addOneCitaPaga(event);
    res.json(event);
};


function getDateArray(date) {
    return [
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes()
    ];
}