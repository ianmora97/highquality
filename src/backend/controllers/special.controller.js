const Special = require('../models/special/special.model');

exports.get = async (req, res) => {
    const limit = req.query?.limit || null;
    const page = req.query?.page || null;
    const sort = req.query?.sort || 'createdAt';

    const special = await Special.get(limit, page, sort);
    res.json(special);
}

exports.create = async (req, res) => {
    const special = await Special.create(req.body);
    res.json(special);
}

exports.update = async (req, res) => {
    const {id} = req.params;
    const special = await Special.update(id, req.body);
    res.json(special);
}

exports.delete = async (req, res) => {
    const {id} = req.params;
    const special = await Special.delete(id);
    res.json(special);
}