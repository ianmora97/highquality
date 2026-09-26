require('../config/passport'); // register all strategies
const passport = require('passport');

/** Role levels for hierarchical access checks */
const ROLE_LEVELS = { client: 1, admin: 2, su: 3 };

/**
 * Require authentication + minimum role for **page** routes.
 * Redirects to the appropriate login page on failure.
 * @param {'client'|'admin'|'su'} minRole
 * @returns {import('express').RequestHandler}
 */
function requirePage(minRole = 'client') {
    const loginUrl = (minRole === 'admin' || minRole === 'su') ? '/dashboard' : '/ingresar?auth=1';
    return (req, res, next) => {
        passport.authenticate('jwt', { session: false }, (err, user) => {
            if (err) return next(err);
            if (!user) return res.redirect(loginUrl);
            if ((ROLE_LEVELS[user.role] ?? 0) < ROLE_LEVELS[minRole]) return res.redirect(loginUrl);
            req.user = user;
            next();
        })(req, res, next);
    };
}

/**
 * Require authentication + minimum role for **API** routes.
 * Returns JSON 401/403 on failure.
 * @param {'client'|'admin'|'su'} minRole
 * @returns {import('express').RequestHandler}
 */
function requireApi(minRole = 'client') {
    return (req, res, next) => {
        passport.authenticate('jwt', { session: false }, (err, user) => {
            if (err) return next(err);
            if (!user) return res.status(401).json({ error: 'No autorizado' });
            if ((ROLE_LEVELS[user.role] ?? 0) < ROLE_LEVELS[minRole]) {
                return res.status(403).json({ error: 'Permisos insuficientes' });
            }
            req.user = user;
            next();
        })(req, res, next);
    };
}

/**
 * Optional: attach user from JWT if present — never redirects.
 * Used on public pages that personalise content when logged in.
 * @type {import('express').RequestHandler}
 */
function attachUser(req, res, next) {
    passport.authenticate('jwt', { session: false }, (err, user) => {
        if (!err && user) req.user = user;
        next();
    })(req, res, next);
}

// Backwards-compatible aliases used by existing routes
const verify       = requirePage('admin');
const verifyClient = requirePage('client');
const attachClient = attachUser;

module.exports = { requirePage, requireApi, attachUser, verify, verifyClient, attachClient };
