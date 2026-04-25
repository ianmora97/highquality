const mongoose = require('mongoose');

const weeklyScheduleSchema = new mongoose.Schema({
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 }, // 0=Sunday, 6=Saturday
    isOpen: { type: Boolean, default: true },
    startTime: { type: String, required: true }, // Format "HH:mm" e.g., "09:00"
    endTime: { type: String, required: true },   // Format "HH:mm" e.g., "20:00"
    breaks: [{
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        reason: { type: String }
    }]
}, { timestamps: true });

weeklyScheduleSchema.index({ dayOfWeek: 1 }, { unique: true });

module.exports = mongoose.model('WeeklyScheduleV2', weeklyScheduleSchema);
