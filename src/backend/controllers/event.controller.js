const Event = require('../models/events/event.model');

exports.get = async (req, res) => {
    const limit = req.query?.limit || null;
    const page = req.query?.page || null;
    const sort = req.query?.sort || 'createdAt';

    const events = await Event.get(limit, page, sort);
    res.json(events);
};

exports.create = async (req, res) => {
    const event = await Event.create(req.body);
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


