const Admin = require('../models/admin/admin.model');
const UserV2 = require('../models/v2/User');
const { sign } = require('../helpers/cipher');

exports.get = async (req, res) => {
    const admins = await Admin.get();
    res.json(admins);
};

exports.auth = async (req, res) => {
    const { user, password } = req.body;
    
    try {
        const adminUser = await UserV2.findOne({ username: user, active: true });
        
        if (adminUser && await adminUser.comparePassword(password)) {
            const token = await sign({
                _id: adminUser._id,
                user: adminUser.username,
                name: adminUser.name,
                role: adminUser.role
            });
            res.cookie('signature', token, { maxAge: 1000 * 60 * 60 * 24, httpOnly: true });
            res.redirect('/admin/panel');
        } else {
            res.json({ error: 'Usuario o contraseña incorrectos' });
        }
    } catch (error) {
        console.error("Admin Login Error:", error);
        res.json({ error: 'Hubo un error al procesar el inicio de sesión' });
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