const mongoose = require('mongoose');
const moment = require('moment');

const SpecialSchema = new mongoose.Schema({
    title: { type: String, required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    type: {
        type: String,
        enum: ['all-day', 'hours', 'range'],
        default: 'all-day'
    },
    color: { type: String, default: '#e44e4e' },
    props: { type: Object, required: false, default: {} },
    createdAt: { type: Date, required: true, default: () => moment().format() }
});

const Special = mongoose.model('Special', SpecialSchema);

module.exports = Special;