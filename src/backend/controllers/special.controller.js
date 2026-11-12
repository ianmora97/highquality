const Special = require('../models/special/special.model');
const SpecialModel = require('../models/special/special.schema');
const realtime = require('../helpers/realtime');
const moment = require('moment');

exports.get = async (req, res) => {
    const limit = req.query?.limit || null;
    const page = req.query?.page || null;
    const sort = req.query?.sort || 'createdAt';

    const special = await Special.get(limit, page, sort);
    res.json(special);
}

exports.check = async (req, res) => {
    const { date } = req.query;
    if (!date) return res.json({ blocked: false });
    const d = moment(date).startOf('day');
    const specials = await SpecialModel.find({
        start: { $lte: d.clone().endOf('day').toDate() },
        end:   { $gte: d.toDate() }
    }).lean();
    if (!specials.length) return res.json({ blocked: false, specials: [] });
    res.json({ blocked: true, specials });
}

exports.create = async (req, res) => {
    const special = await Special.create(req.body);
    realtime.specialChanged(special);
    res.json(special);
}

exports.update = async (req, res) => {
    const {id} = req.params;
    const special = await Special.update(id, req.body);
    realtime.specialChanged(special);
    res.json(special);
}

exports.delete = async (req, res) => {
    const {id} = req.params;
    const special = await Special.delete(id);
    realtime.specialChanged(special);
    res.json(special);
}