const mongoose = require('mongoose');
const moment = require('moment');

const HorarioSchema = new mongoose.Schema({
    day: {
        type: String,
        required: true,
    },
    hours:{
        type: Array,
        required: true,
    },
    enable: {
        type: Boolean,
        required: true,
    },
});

const Horario = mongoose.model('Horario', HorarioSchema);

module.exports = Horario;