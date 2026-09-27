const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        unique: false
    },
    numero:{
        type: Number,
        required: true,
        unique: true,
    },
    citasPagas:{
        type: Number,
        default: 0,
    },
    password: {
        type: String,
        default: '',
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

const Client = mongoose.model('Client', ClientSchema);

module.exports = Client;