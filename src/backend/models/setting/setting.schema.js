const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
    whatsappConfirmEnabled: { type: Boolean, default: true },
}, { timestamps: true });

SettingSchema.statics.getSingleton = async function () {
    let doc = await this.findOne();
    if (!doc) doc = await this.create({});
    return doc;
};

const Setting = mongoose.model('Setting', SettingSchema);
module.exports = Setting;
