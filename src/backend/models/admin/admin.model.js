const Admin = require('./admin.schema');

exports.get = async () => {
    const admins = await Admin.find();
    return admins;
};

exports.auth = async (user) => {
    try {
        const admin = await Admin.findOne({user});
        return admin;
    } catch (error) {
        console.log(error);
    }
};

exports.create = async (admin) => {
    // createdAt/updatedAt are Date fields: a 'DD/MM/YYYY' string fails the cast.
    admin.createdAt = new Date();
    admin.updatedAt = new Date();
    const newAdmin = new Admin(admin);
    await newAdmin.save();
    return newAdmin;
};

exports.update = async (id, data) => {
    data.updatedAt = new Date();
    const admin = await Admin.findByIdAndUpdate(id, data);
    return admin;
};

exports.delete = async (id) => {
    const admin = await Admin.findByIdAndDelete(id);
    return admin;
};