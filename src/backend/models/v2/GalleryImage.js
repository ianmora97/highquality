const mongoose = require('mongoose');

const galleryImageSchema = new mongoose.Schema({
    imagePath: { type: String, required: true },
    caption: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true }
}, { timestamps: true });

galleryImageSchema.index({ displayOrder: 1 });

module.exports = mongoose.model('GalleryImageV2', galleryImageSchema);
