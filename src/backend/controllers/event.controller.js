const Event = require('../models/events/event.model');
const { addClient, addOneCitaPaga } = require('../helpers/addClient');
const { sendWhatsappMessage } = require('../helpers/whatsapp');
const { sendTelegramMessage } = require('../helpers/telegram');


exports.get = async (req, res) => {
    const limit = req.query?.limit || null;
    const page = req.query?.page || null;
    const sort = req.query?.sort || 'createdAt';
    const only = req.query?.onlyThisDay || null;

    const events = await Event.get(limit, page, sort, only);
    res.json(events);
};

exports.getMonth = async (req, res) => {
    const month = req.query?.month || null;
    const events = await Event.getMonth(month);
    res.json(events);
};

exports.create = async (req, res) => {
    if(req.body.title != 'Cerrado'){
        const client = await addClient(req.body);
        req.body.title = client.nombre;
        const event = await Event.create(req.body);
        res.json(event);
    }else{
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
    const {id} = req.params;
    const event = await Event.update(id, req.body);
    res.json(event);
};

exports.delete = async (req, res) => {
    const {id} = req.params;
    const event = await Event.delete(id);
    res.json(event);
};

exports.pagar = async (req, res) => {
    const {id} = req.params;
    const monto = req.body.monto;
    const event = await Event.pagar(id,monto);
    await addOneCitaPaga(event);
    res.json(event);
};


