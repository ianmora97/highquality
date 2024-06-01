const mongoose = require('mongoose');
const moment = require('moment');

const ClientSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        unique: true,
    },
    numero:{
        type: Number,
        required: true,
    },
    citasPagas:{
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: moment().format()
    },
});

const Client = mongoose.model('Client', ClientSchema);

module.exports = Client;