const mongoose = require('mongoose');

/**
 * Session — tracks the single active session per user.
 * unique on `user` ensures only one session at a time.
 * TTL index on `expiresAt` lets Mongo auto-remove expired sessions.
 */
const SessionSchema = new mongoose.Schema({
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    jti:       { type: String, required: true, unique: true },
    userAgent: { type: String, default: '' },
    ip:        { type: String, default: '' },
    expiresAt: { type: Date, required: true },
});

SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', SessionSchema);
