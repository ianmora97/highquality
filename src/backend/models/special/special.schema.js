const mongoose = require('mongoose');
const moment = require('moment');

const SpecialSchema = new mongoose.Schema({
    title:{
        type: String,
        required: true,
    },
    start:{
        type: Date,
        required: true,
    },
    end:{
        type: Date,
        required: true,
    },
    props:{
        type: Object,
        required: true,
    },
    createdAt:{
        type: Date,
        required: true,
        default: moment().format()
    }
});

const Special = mongoose.model('Special', SpecialSchema);

module.exports = Special;