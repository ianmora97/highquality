const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientV2', required: true },
    
    // Policy rule that triggered this reward (e.g. "10th haircut free")
    triggerReason: { type: String, required: true },
    
    status: { type: String, enum: ['available', 'redeemed', 'expired'], default: 'available' },
    
    issuedDate: { type: Date, default: Date.now },
    redeemedDate: { type: Date },
    expiryDate: { type: Date }, // Optional: rewards expire? Currently no.
    
    redeemedAppointment: { type: mongoose.Schema.Types.ObjectId, ref: 'AppointmentV2' }
}, { timestamps: true });

rewardSchema.index({ client: 1, status: 1 });

module.exports = mongoose.model('RewardV2', rewardSchema);
