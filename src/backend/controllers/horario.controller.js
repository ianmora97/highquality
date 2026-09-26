const Horario = require('../models/horario/horario.model');

function computeHoursFromRange(startTime, endTime) {
    if (!startTime || !endTime) return null;
    const slots = [];
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    let cur = sh * 60 + sm;
    const end = eh * 60 + em;
    while (cur < end) {
        const h = Math.floor(cur / 60);
        const m = cur % 60;
        const ampm = h < 12 ? 'am' : 'pm';
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        slots.push(`${h12}:${String(m).padStart(2, '0')} ${ampm}`);
        cur += 30;
    }
    return slots;
}

exports.get = async (req, res) => {
    const horarios = await Horario.get();
    const result = horarios.map(h => {
        if (h.startTime && h.endTime) {
            h.hours = computeHoursFromRange(h.startTime, h.endTime);
        }
        return h;
    });
    res.json(result);
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