const mongoose = require('mongoose');

const ServicesSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description:{
        type: String,
        required: false
    },
    price:{
        type: Number,
        required: true,
        default: 0
    },
    icon:{
        type: String,
        required: false,
        default: '1.png'
    },
    enable:{
        type: Boolean,
        required: true,
        default: true
    },
});

const Services = mongoose.model('Services', ServicesSchema);

module.exports = Services;
