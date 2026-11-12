const mongoose = require('mongoose');

/**
 * UserRol — join table between User and Rol.
 * unique on `user` enforces one role per user.
 */
const UserRolSchema = new mongoose.Schema({
    user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    rol:        { type: mongoose.Schema.Types.ObjectId, ref: 'Rol',  required: true },
    assignedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('UserRol', UserRolSchema);
