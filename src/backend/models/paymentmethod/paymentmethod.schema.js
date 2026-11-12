const mongoose = require('mongoose');

const PaymentMethodSchema = new mongoose.Schema({
    name: { type: String, required: true },
    details: { type: String, default: '' },
    enable: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
}, { timestamps: true });

const DEFAULTS = [
    { name: 'Efectivo', details: '', order: 0 },
    { name: 'Sinpe Móvil', details: '60605358', order: 1 },
    { name: 'Sinpe Móvil', details: '72451908', order: 2 },
    { name: 'Sinpe Móvil', details: '11001100', order: 3 },
];

PaymentMethodSchema.statics.getAll = async function () {
    const count = await this.countDocuments();
    if (count === 0) {
        await this.insertMany(DEFAULTS);
    }
    return this.find().sort({ order: 1, createdAt: 1 });
};

PaymentMethodSchema.statics.getEnabled = async function () {
    const count = await this.countDocuments();
    if (count === 0) {
        await this.insertMany(DEFAULTS);
    }
    return this.find({ enable: true }).sort({ order: 1, createdAt: 1 });
};

const PaymentMethod = mongoose.model('PaymentMethod', PaymentMethodSchema);
module.exports = PaymentMethod;
