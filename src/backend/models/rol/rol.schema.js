const mongoose = require('mongoose');

/**
 * Rol model.
 * level: client=1, admin=2, su=3 (hierarchical access)
 */
const RolSchema = new mongoose.Schema({
    name:  { type: String, enum: ['client', 'admin', 'su'], required: true, unique: true },
    label: { type: String, required: true },
    level: { type: Number, required: true },
});

module.exports = mongoose.model('Rol', RolSchema);
