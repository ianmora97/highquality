const jwt    = require('jsonwebtoken');
const crypto = require('crypto');

const SECRET     = process.env.JWT_SECRET || process.env.SECRET;
const EXPIRES    = process.env.JWT_EXPIRES || '7d';
const TTL_MS     = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const COOKIE_NAME = 'hq_token';

/** Generate a cryptographically random JWT ID (jti) */
exports.generateJti = () => crypto.randomUUID();

/**
 * Sign a JWT with the user payload.
 * @param {{ sub: string, role: string, name: string, phone?: number, jti: string }} payload
 * @returns {string} signed JWT
 */
exports.signToken = ({ sub, role, name, phone, jti }) =>
    jwt.sign({ sub, role, name, phone, jti }, SECRET, { expiresIn: EXPIRES });

/** Synchronously verify and decode a token (throws on failure) */
exports.verifyToken = (token) => jwt.verify(token, SECRET);

/**
 * Set the unified auth cookie on a response.
 * @param {import('express').Response} res
 * @param {string} token
 */
exports.setAuthCookie = (res, token) => {
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure:   process.env.NODE_ENV === 'prod',
        maxAge:   TTL_MS,
    });
};

/** Clear the auth cookie */
exports.clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME);

exports.COOKIE_NAME = COOKIE_NAME;
exports.TTL_MS      = TTL_MS;
