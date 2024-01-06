const mongoose = require('mongoose');
const moment = require('moment');

const AdminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    user:{
        type: String,
        required: true,
        unique: true,
    },
    password:{
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: moment().format('DD/MM/YYYY hh:mm:ss')
    },
    updatedAt: {
        type: Date,
        default: moment().format('DD/MM/YYYY hh:mm:ss')
    }
});

const Admin = mongoose.model('Admin', AdminSchema);

module.exports = Admin;