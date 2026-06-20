require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const { MONGODB_URI } = process.env;

const AdminSchema = new mongoose.Schema({
    name:     { type: String, required: true, unique: true },
    user:     { type: String, required: true, unique: true },
    password: { type: String, required: true },
});
const Admin = mongoose.model('Admin', AdminSchema);

const CREDENTIALS = {
    name:     'Administrador',
    user:     'admin',
    password: 'HQ@Admin2025!',
};

async function run() {
    await mongoose.connect(MONGODB_URI);
    console.log('[OK] MongoDB connected');

    const existing = await Admin.findOne({ user: CREDENTIALS.user });
    if (existing) {
        console.log('[SKIP] Admin user already exists:', CREDENTIALS.user);
        process.exit(0);
    }

    const hash = await bcrypt.hash(CREDENTIALS.password, 12);
    await Admin.create({ name: CREDENTIALS.name, user: CREDENTIALS.user, password: hash });

    console.log('\n✓ Admin created');
    console.log('  user:    ', CREDENTIALS.user);
    console.log('  password:', CREDENTIALS.password);
    process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
