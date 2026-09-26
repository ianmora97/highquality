const mongoose = require('mongoose');

const HorarioSchema = new mongoose.Schema({
    day: {
        type: String,
        required: true,
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