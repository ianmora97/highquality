const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'AppointmentV2' },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientV2' }, // For tracking
    amount: { type: Number, required: true },
    method: { type: String, enum: ['efectivo', 'sinpe', 'tarjeta'], required: true },
    paymentDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['completed', 'refunded'], default: 'completed' },
    
    // Notes for SINPE references or manual cash tracking
    reference: { type: String },
    
    // Legacy support
    legacyId: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

// Indexes for financial reports
paymentSchema.index({ paymentDate: -1 });

module.exports = mongoose.model('PaymentV2', paymentSchema);
