const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientV2' }, // Optional, can be anonymous
    clientName: { type: String, required: true }, // Save name if client not registered/deleted
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
    
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'AppointmentV2' } // Optional link
}, { timestamps: true });

reviewSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ReviewV2', reviewSchema);
