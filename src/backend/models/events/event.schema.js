const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    title: {
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
    allDay: {
        type: Boolean,
        required: true,
        default: false
    },
    display: {
        type: String,
        required: true,
        default: 'auto'
    },
    backgroundColor: {
        type: String,
        required: true,
        default: '#ffffff'
    },
    borderColor: {
        type: String,
        required: true,
    },
    textColor: {
        type: String,
        required: true,
    },
    extendedProps: {
        type: Object,
        required: true,
        default: {}
    },
    classNames:{
        type: Array,
        required: false,
        default: []
    },
    description: {
        type: String,
        required: false,
        default: ''
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
});

const Event = mongoose.model('Event', EventSchema);

module.exports = Event;