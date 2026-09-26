const argon2 = require('argon2');

const OPTIONS = {
    type:        argon2.argon2id,
    memoryCost:  65536, // 64 MB
    timeCost:    3,
    parallelism: 1,
};

/**
 * Hash a plaintext password using argon2id.
 * @param {string} password
 * @returns {Promise<string>}
 */
exports.hash = (password) => argon2.hash(password, OPTIONS);

/**
 * Verify a password against an argon2id hash.
 * @param {string} hash  — stored hash
 * @param {string} password — plaintext to check
 * @returns {Promise<boolean>}
 */
exports.verify = (hash, password) => argon2.verify(hash, password);
