const Horario = require('../models/horario/horario.model');

exports.get = async (req, res) => {
    const horario = await Horario.get();
    res.json(horario);
};

exports.create = async (req, res) => {
    const horario = await Horario.create(req.body);
    res.json(horario);
};

exports.update = async (req, res) => {
    const {id} = req.params;
    const horario = await Horario.update(id, req.body);
    res.json(horario);
};

exports.delete = async (req, res) => {
    const {id} = req.params;
    const horario = await Horario.delete(id);
    res.json(horario);
};