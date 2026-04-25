const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    reason: { type: String, required: true }, // "Lunch", "Personal", "Maintenance"
    legacyId: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

blockSchema.index({ startTime: 1, endTime: 1 });

module.exports = mongoose.model('BlockV2', blockSchema);
