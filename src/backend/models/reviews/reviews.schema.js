const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    nombre: {
        type: String,
        trim: true,
        maxlength: 60,
        default: 'Anónimo',
    },
    // Snapshot of the author's phone/account at submission time — lets the
    // barber see who's talking (repeat client vs one-off) and lets the client
    // find their own reviews without trusting a spoofable name field.
    phone: {
        type: Number,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    review: {
        type: String,
        required: true,
        trim: true,
        maxlength: 600,
    },
    stars: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    // Replaces the old `display` boolean: `rejected` is a distinct outcome
    // from "not reviewed yet", so spam/abuse can be dismissed without it
    // resurfacing in the pending queue.
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
    reviewedAt: {
        type: Date,
    },
    // The barber's public reply — shown back to the client and, once
    // approved, alongside the review on the site.
    reply: {
        type: String,
        trim: true,
        maxlength: 400,
        default: '',
    },
    repliedAt: {
        type: Date,
    },
}, { timestamps: true });

ReviewSchema.index({ status: 1, createdAt: -1 });
ReviewSchema.index({ phone: 1, createdAt: -1 });

const Review = mongoose.model('Review', ReviewSchema);

module.exports = Review;
