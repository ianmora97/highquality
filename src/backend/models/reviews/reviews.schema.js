const mongoose = require('mongoose');
const moment = require('moment');

const ReviewSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: false,
    },
    review: {
        type: String,
        required: true,
    },
    stars: {
        type: Number,
        default: 1,
    },
    display: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        required: true,
        default: moment().format()
    },
});

const Review = mongoose.model('Review', ReviewSchema);

module.exports = Review;