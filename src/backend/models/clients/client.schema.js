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
    createdAt: {
        type: Date,
        default: moment().format('DD/MM/YYYY hh:mm:ss')
    },
});

const Client = mongoose.model('Client', ClientSchema);

module.exports = Client;