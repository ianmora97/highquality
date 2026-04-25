const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    durationMinutes: { type: Number, required: true, default: 30 },
    price: { type: Number, required: true },
    active: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    imagePath: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('ServiceV2', serviceSchema);
