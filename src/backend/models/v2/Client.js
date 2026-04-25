const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true },
    whatsappOptIn: { type: Boolean, default: true },
    notes: { type: String, default: '' },
    
    // Stats for loyalty
    totalAppointments: { type: Number, default: 0 },
    noShowCount: { type: Number, default: 0 },
    revenueGenerated: { type: Number, default: 0 },
    
    // Loyalty and Rewards
    activeRewards: { type: Number, default: 0 },
    
    // Legacy mapping
    legacyId: { type: mongoose.Schema.Types.Mixed },
    legacyPaidAppointmentsCount: { type: Number, default: 0 }
}, { timestamps: true });

// Index for quick search by phone
clientSchema.index({ phone: 1 });

module.exports = mongoose.model('ClientV2', clientSchema);
