const mongoose = require('mongoose');

const GallerySchema = new mongoose.Schema({
    imageUrl: { type: String, required: true },
    imageKey: { type: String, required: false, default: '' },
    title: { type: String, required: false, default: '' },
    description: { type: String, required: false, default: '' },
    instagramLink: { type: String, required: false, default: '' },
    createdAt: { type: Date, default: () => new Date() }
});

const Gallery = mongoose.model('Gallery', GallerySchema);
module.exports = Gallery;
