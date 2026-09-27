const Horario = require('../models/horario/horario.model');
const { normalizeBlocks, baseSlots, hydrateHorario } = require('../helpers/slots');
const realtime = require('../helpers/realtime');

// Blocks are the source of truth; hours/startTime/endTime are stored derived so
// anything reading the collection directly still sees a coherent schedule.
function withDerived(body) {
    if (!body || !Array.isArray(body.blocks)) return body;
    const blocks = normalizeBlocks(body.blocks);
    return {
        ...body,
        blocks,
        hours: baseSlots(blocks),
        startTime: blocks.length ? blocks[0].start : '',
        endTime: blocks.length ? blocks[blocks.length - 1].end : '',
    };
}

exports.get = async (req, res) => {
    const horarios = await Horario.get();
    res.json(horarios.map(hydrateHorario));
};

exports.create = async (req, res) => {
    const horario = await Horario.create(withDerived(req.body));
    realtime.horarioChanged(horario);
    res.json(horario);
};

exports.update = async (req, res) => {
    const {id} = req.params;
    const horario = await Horario.update(id, withDerived(req.body));
    realtime.horarioChanged(horario);
    res.json(horario);
};

exports.delete = async (req, res) => {
    const {id} = req.params;
    const horario = await Horario.delete(id);
    realtime.horarioChanged(horario);
    res.json(horario);
};
