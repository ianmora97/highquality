require('dotenv').config();
const mongoose = require('mongoose');
const UserV2 = require('../../backend/models/v2/User');

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB for Admin Seed');

        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || '123456'; // Default

        const existingAdmin = await UserV2.findOne({ username: adminUsername });

        if (existingAdmin) {
            console.log(`ℹ️ Admin user '${adminUsername}' already exists. Skipping seed.`);
        } else {
            const admin = new UserV2({
                name: 'High Quality Admin',
                username: adminUsername,
                password: adminPassword, // Model handles hashing pre-save
                role: 'admin',
                active: true
            });
            await admin.save();
            console.log(`✅ Admin user '${adminUsername}' created successfully.`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding admin:', error.message);
        process.exit(1);
    }
};

seedAdmin();
