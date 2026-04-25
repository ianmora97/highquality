const mongoose = require('mongoose');

const scheduleExceptionSchema = new mongoose.Schema({
    date: { type: Date, required: true }, // Exact date
    isOpen: { type: Boolean, default: false }, // Closed for holiday vs special hours
    
    // If open with special hours:
    startTime: { type: String }, // "HH:mm"
    endTime: { type: String },
    
    reason: { type: String, required: true },
    isRepeatingYearly: { type: Boolean, default: false }
}, { timestamps: true });

scheduleExceptionSchema.index({ date: 1 });

module.exports = mongoose.model('ScheduleExceptionV2', scheduleExceptionSchema);
