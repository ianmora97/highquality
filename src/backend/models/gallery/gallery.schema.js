const mongoose = require('mongoose');

const GallerySchema = new mongoose.Schema({
    imageUrl: { type: String, required: true },
    imageKey: { type: String, required: false, default: '' },
    title: { type: String, required: false, default: '' },
    description: { type: String, required: false, default: '' },
    instagramLink: { type: String, required: false, default: '' },

    // Only `visible: true` rows reach /galeria. The admin grid sees everything,
    // so a photo can be uploaded and staged before it goes live.
    visible: { type: Boolean, default: true, index: true },

    // Crop preset key from helpers/aspects.js, plus the real stored pixel size —
    // the public grid needs the ratio to reserve space before the image loads.
    aspect: { type: String, default: '4:5' },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },

    // Manual ordering; ties fall back to newest first.
    order: { type: Number, default: 0, index: true },

    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
});

GallerySchema.index({ visible: 1, order: 1, createdAt: -1 });

const Gallery = mongoose.model('Gallery', GallerySchema);
module.exports = Gallery;
