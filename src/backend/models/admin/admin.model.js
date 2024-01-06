const Admin = require('./admin.schema');

exports.get = async () => {
    const admins = await Admin.find();
    return admins;
};

exports.auth = async (user, password) => {
    try {
        const admin = await Admin.findOne({user, password});
        return admin;
    } catch (error) {
        console.log(error);
    }
};

exports.create = async (admin) => {
    const newAdmin = new Admin(admin);
    await newAdmin.save();
    return newAdmin;
};

exports.update = async (id, data) => {
    const admin = await Admin.findByIdAndUpdate(id, data);
    return admin;
};

exports.delete = async (id) => {
    const admin = await Admin.findByIdAndDelete(id);
    return admin;
};