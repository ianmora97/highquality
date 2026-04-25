const mongoose = require('mongoose');

const recurringAppointmentSchema = new mongoose.Schema({
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientV2', required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceV2', required: true },
    
    frequency: { type: String, enum: ['weekly', 'biweekly', 'monthly'], required: true },
    dayOfWeek: { type: Number, min: 0, max: 6, required: true }, // Only relevant for weekly/biweekly
    timeOfDay: { type: String, required: true }, // "HH:mm" format
    
    startDate: { type: Date, required: true },
    endDate: { type: Date }, // Optional: end date of the series
    occurrences: { type: Number }, // Alternatively, amount of occurrences
    
    status: { type: String, enum: ['active', 'paused', 'cancelled'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('RecurringAppointmentV2', recurringAppointmentSchema);
