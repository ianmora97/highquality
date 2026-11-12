const Admin = require('../models/admin/admin.model');

exports.get = async (req, res) => {
    const admins = await Admin.get();
    res.json(admins);
};

exports.create = async (req, res) => {
    const admin = await Admin.create(req.body);
    res.json(admin);
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const admin  = await Admin.update(id, req.body);
    res.json(admin);
};

exports.delete = async (req, res) => {
    const { id } = req.params;
    const admin  = await Admin.delete(id);
    res.json(admin);
};
