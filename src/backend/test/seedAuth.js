/**
 * seedAuth — creates roles + initial staff users (admin + su) in the new `users` collection.
 * Idempotent: safe to run multiple times.
 *
 * Usage:  npm run auth:seed
 *
 * Default credentials (override via .env):
 *   su:    username=superuser   password=HQ@Su2025!
 *   admin: username=admin       password=HQ@Admin2025!
 */
require('dotenv').config();
const mongoose = require('mongoose');
const argon2   = require('argon2');

const User    = require('../models/user/user.schema');
const Rol     = require('../models/rol/rol.schema');
const UserRol = require('../models/userRol/userRol.schema');

const HASH_OPTIONS = {
    type:        argon2.argon2id,
    memoryCost:  65536, // 64 MB
    timeCost:    3,
    parallelism: 1,
};

const ROLES = [
    { name: 'client', label: 'Cliente',         level: 1 },
    { name: 'admin',  label: 'Administrador',   level: 2 },
    { name: 'su',     label: 'Super Usuario',   level: 3 },
];

const STAFF = [
    {
        username: process.env.ADMIN_USER     || 'admin',
        email:    process.env.ADMIN_EMAIL    || 'admin@highquality.local',
        name:     process.env.ADMIN_NAME     || 'Administrador',
        password: process.env.ADMIN_PASSWORD || 'HQ@Admin2025!',
        role:     'admin',
    },
    {
        username: process.env.SU_USER        || 'superuser',
        email:    process.env.SU_EMAIL       || 'su@highquality.local',
        name:     process.env.SU_NAME        || 'Super Usuario',
        password: process.env.SU_PASSWORD    || 'HQ@Su2025!',
        role:     'su',
    },
];

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[seedAuth] Connected to MongoDB');

    // ── 1. Upsert roles ──────────────────────────────────────────────────────
    for (const r of ROLES) {
        await Rol.findOneAndUpdate({ name: r.name }, r, { upsert: true, new: true });
        console.log(`[seedAuth] Role "${r.name}" (level ${r.level}) ready`);
    }

    // ── 2. Upsert staff users ────────────────────────────────────────────────
    for (const s of STAFF) {
        const rol = await Rol.findOne({ name: s.role });
        if (!rol) throw new Error(`Role "${s.role}" not found`);

        let user = await User.findOne({ username: s.username });
        if (!user) {
            const hashed = await argon2.hash(s.password, HASH_OPTIONS);
            user = await User.create({
                name:     s.name,
                username: s.username,
                email:    s.email,
                password: hashed,
                provider: 'local',
                active:   true,
            });
            console.log(`[seedAuth] Created user "${s.username}" (${s.role})`);
            console.log(`            password: ${s.password}`);
        } else {
            console.log(`[seedAuth] User "${s.username}" already exists — skipping`);
        }

        // Ensure role assignment
        await UserRol.findOneAndUpdate(
            { user: user._id },
            { user: user._id, rol: rol._id },
            { upsert: true, new: true }
        );
        console.log(`[seedAuth] Role "${s.role}" assigned to "${s.username}"`);
    }

    console.log('[seedAuth] Done ✓');
    process.exit(0);
}

run().catch(err => {
    console.error('[seedAuth] Error:', err);
    process.exit(1);
});
