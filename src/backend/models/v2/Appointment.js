const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientV2', required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceComboV2', required: true },
    
    // Calendar timing
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    durationMinutes: { type: Number, required: true },
    
    // Status
    status: { 
        type: String, 
        enum: ['pending', 'completed', 'cancelled', 'no_show', 'recurring_reserved'], 
        default: 'pending' 
    },
    
    // Financial mapping
    priceCharged: { type: Number },
    paymentMethod: { type: String, enum: ['efectivo', 'sinpe', 'tarjeta', 'reward', 'none'], default: 'none' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
    
    // Recurring link
    recurringSeriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecurringAppointmentV2' },
    
    // Legacy mapping
    legacyId: { type: mongoose.Schema.Types.Mixed },
    legacySnapshot: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

// Indexes for fast calendar queries
appointmentSchema.index({ startTime: 1, endTime: 1 });
appointmentSchema.index({ status: 1 });

module.exports = mongoose.model('AppointmentV2', appointmentSchema);
