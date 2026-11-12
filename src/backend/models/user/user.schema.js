const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name:       { type: String, required: true },
    username:   { type: String, unique: true, sparse: true },
    email:      { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone:      { type: Number, unique: true, sparse: true },
    password:   { type: String, default: '', select: false },
    citasPagas: { type: Number, default: 0 },
    provider:   { type: String, enum: ['local', 'google'], default: 'local' },
    googleId:   { type: String, unique: true, sparse: true },
    active:     { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
