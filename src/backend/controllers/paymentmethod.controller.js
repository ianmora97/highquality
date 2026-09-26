const PaymentMethod = require('../models/paymentmethod/paymentmethod.schema');

exports.getAll = async (req, res) => {
    const methods = await PaymentMethod.getAll();
    res.json(methods);
};

exports.getEnabled = async (req, res) => {
    const methods = await PaymentMethod.getEnabled();
    res.json(methods);
};

exports.create = async (req, res) => {
    const last = await PaymentMethod.findOne().sort({ order: -1 });
    req.body.order = last ? last.order + 1 : 0;
    const method = await PaymentMethod.create(req.body);
    res.json(method);
};

exports.update = async (req, res) => {
    const method = await PaymentMethod.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(method);
};

exports.delete = async (req, res) => {
    await PaymentMethod.findByIdAndDelete(req.params.id);
    res.json({ success: true });
};
