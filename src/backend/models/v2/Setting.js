const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true }, // e.g., 'reward_policy_count'
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: String }
}, { timestamps: true });

settingSchema.index({ key: 1 });

module.exports = mongoose.model('SettingV2', settingSchema);
