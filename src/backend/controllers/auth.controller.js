const passport = require('../config/passport');
const { generateJti, signToken, setAuthCookie, clearAuthCookie, TTL_MS } = require('../helpers/token');
const { hash }  = require('../helpers/password');
const User      = require('../models/user/user.schema');
const UserRol   = require('../models/userRol/userRol.schema');
const Rol       = require('../models/rol/rol.schema');
const Session   = require('../models/session/session.schema');

/**
 * Create (or replace) the active session for this user, sign a JWT, set the cookie.
 * Upsert by user._id ensures only one active session exists at any time.
 */
async function createSession(res, user, rol, req) {
    const jti       = generateJti();
    const expiresAt = new Date(Date.now() + TTL_MS);

    await Session.findOneAndUpdate(
        { user: user._id },
        {
            jti,
            expiresAt,
            userAgent: req.headers['user-agent'] || '',
            ip:        req.ip || '',
        },
        { upsert: true, new: true }
    );

    const token = signToken({
        sub:   user._id,
        role:  rol.name,
        name:  user.name,
        phone: user.phone,
        jti,
    });

    setAuthCookie(res, token);
    return token;
}

// ─── POST /dashboard/login ────────────────────────────────────────────────────
exports.loginStaff = (req, res, next) => {
    passport.authenticate('local-staff', { session: false }, async (err, result, info) => {
        if (err) return next(err);
        if (!result) {
            return res.status(401).json({ error: info?.message || 'Usuario o contraseña incorrectos' });
        }
        try {
            await createSession(res, result.user, result.rol, req);
            res.json({ success: true, redirect: '/dashboard/panel' });
        } catch (e) {
            next(e);
        }
    })(req, res, next);
};

// ─── POST /api/v1/auth/client/login ──────────────────────────────────────────
exports.loginClient = (req, res, next) => {
    passport.authenticate('local-client', { session: false }, async (err, result, info) => {
        if (err) return next(err);
        if (!result) {
            return res.status(401).json({ error: info?.message || 'Credenciales incorrectas' });
        }
        try {
            await createSession(res, result.user, result.rol, req);
            res.json({ success: true, name: result.user.name });
        } catch (e) {
            next(e);
        }
    })(req, res, next);
};

// ─── POST /api/v1/auth/client/register ───────────────────────────────────────
exports.registerClient = async (req, res, next) => {
    try {
        // Support both new field names (phone/name) and legacy names (numero/nombre)
        const phone    = req.body.phone    || req.body.numero;
        const name     = req.body.name     || req.body.nombre;
        const password = req.body.password;

        if (!phone || !name || !password) {
            return res.status(400).json({ error: 'Datos incompletos' });
        }
        if (String(phone).replace(/\D/g, '').length !== 8) {
            return res.status(400).json({ error: 'El número debe tener exactamente 8 dígitos' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
        }

        const existing = await User.findOne({ phone: parseInt(phone) }).select('+password');
        if (existing && existing.password) {
            return res.status(409).json({ error: 'Ya existe una cuenta con este número' });
        }

        const clientRol = await Rol.findOne({ name: 'client' });
        if (!clientRol) {
            return res.status(500).json({ error: 'Configuración incompleta. Ejecuta npm run seed.' });
        }

        const hashed = await hash(password);

        let user;
        if (existing) {
            // Upgrade existing phone-only account
            existing.name     = String(name).trim();
            existing.password = hashed;
            await existing.save();
            user = existing;
        } else {
            user = await User.create({
                name:     String(name).trim(),
                phone:    parseInt(phone),
                password: hashed,
                provider: 'local',
            });
            await UserRol.create({ user: user._id, rol: clientRol._id });
        }

        const userRol = await UserRol.findOne({ user: user._id }).populate('rol');
        await createSession(res, user, userRol.rol, req);
        res.json({ success: true, name: user.name });
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/v1/auth/logout ─────────────────────────────────────────────────
exports.logout = async (req, res) => {
    if (req.user?.id) {
        await Session.deleteOne({ user: req.user.id });
    }
    clearAuthCookie(res);
    res.json({ success: true });
};

// ─── GET /api/v1/auth/me ──────────────────────────────────────────────────────
exports.me = (req, res) => res.json({ user: req.user });

// ─── Google OAuth stubs (not implemented yet) ─────────────────────────────────
exports.googleStart    = (_req, res) => res.status(501).json({ error: 'Google OAuth no implementado aún' });
exports.googleCallback = (_req, res) => res.status(501).json({ error: 'Google OAuth no implementado aún' });
