const mongoose = require('mongoose');

const BlockSchema = new mongoose.Schema({
    start: { type: String, required: true },
    end:   { type: String, required: true },
}, { _id: false });

const HorarioSchema = new mongoose.Schema({
    day: {
        type: String,
        required: true,
    },
    blocks: {
        type: [BlockSchema],
        required: false,
        default: [],
    },
    hours: {
        type: Array,
        required: false,
        default: [],
    },
    startTime: {
        type: String,
        required: false,
        default: '',
    },
    endTime: {
        type: String,
        required: false,
        default: '',
    },
    enable: {
        type: Boolean,
        required: true,
    },
});

const Horario = mongoose.model('Horario', HorarioSchema);

module.exports = Horario;