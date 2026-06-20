const Admin = require('../models/admin/admin.model');
const { sign } = require('../helpers/cipher');
const bcrypt = require('bcrypt');

exports.get = async (req, res) => {
    const admins = await Admin.get();
    res.json(admins);
};

exports.auth = async (req, res) => {
    const {user, password} = req.body;
    const admin = await Admin.auth(user);

    const match = admin && await bcrypt.compare(password, admin.password);
    if(match){
        const token = await sign({
            _id: admin._id,
            user: admin.user,
            name: admin.name
        });
        res.cookie('signature', token, { maxAge: 1000 * 60 * 60 * 24, httpOnly: true });
        res.redirect('/dashboard/panel')
    }else{
        res.json({error: 'Usuario o contraseña incorrectos'});
    }
};

exports.create = async (req, res) => {
    const admin = await Admin.create(req.body);
    res.json(admin);
};

exports.update = async (req, res) => {
    const {id} = req.params;
    const admin = await Admin.update(id, req.body);
    res.json(admin);
};

exports.delete = async (req, res) => {
    const {id} = req.params;
    const admin = await Admin.delete(id);
    res.json(admin);
};