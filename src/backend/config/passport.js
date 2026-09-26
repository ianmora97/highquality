const passport    = require('passport');
const { Strategy: LocalStrategy } = require('passport-local');
const { Strategy: JwtStrategy }   = require('passport-jwt');

const User    = require('../models/user/user.schema');
const UserRol = require('../models/userRol/userRol.schema');
const Session = require('../models/session/session.schema');
const pwd     = require('../helpers/password');
const { COOKIE_NAME } = require('../helpers/token');

const SECRET = process.env.JWT_SECRET || process.env.SECRET;

// ─── Staff (admin / su): username or email + password ────────────────────────
passport.use('local-staff', new LocalStrategy(
    { usernameField: 'identifier', passwordField: 'password' },
    async (identifier, password, done) => {
        try {
            const isEmail = /\S+@\S+\.\S+/.test(identifier);
            const query   = isEmail
                ? { email: identifier.toLowerCase().trim() }
                : { username: identifier.trim() };

            const user = await User.findOne(query).select('+password');
            if (!user || !user.active) {
                return done(null, false, { message: 'Usuario o contraseña incorrectos' });
            }

            const userRol = await UserRol.findOne({ user: user._id }).populate('rol');
            if (!userRol || !['admin', 'su'].includes(userRol.rol.name)) {
                return done(null, false, { message: 'Acceso no autorizado' });
            }

            const ok = await pwd.verify(user.password, password);
            if (!ok) return done(null, false, { message: 'Usuario o contraseña incorrectos' });

            return done(null, { user, rol: userRol.rol });
        } catch (err) {
            return done(err);
        }
    }
));

// ─── Client: phone + password ─────────────────────────────────────────────────
passport.use('local-client', new LocalStrategy(
    { usernameField: 'phone', passwordField: 'password' },
    async (phone, password, done) => {
        try {
            const user = await User.findOne({ phone: parseInt(phone) }).select('+password');
            if (!user || !user.active) {
                return done(null, false, { message: 'Cuenta no encontrada' });
            }

            const userRol = await UserRol.findOne({ user: user._id }).populate('rol');
            if (!userRol || userRol.rol.name !== 'client') {
                return done(null, false, { message: 'Acceso no autorizado' });
            }

            if (!user.password) {
                return done(null, false, { message: 'Crea una contraseña desde "Crear cuenta"' });
            }

            const ok = await pwd.verify(user.password, password);
            if (!ok) return done(null, false, { message: 'Contraseña incorrecta' });

            return done(null, { user, rol: userRol.rol });
        } catch (err) {
            return done(err);
        }
    }
));

// ─── JWT: cookie extractor + single-session jti check ─────────────────────────
function cookieExtractor(req) {
    return req?.cookies?.[COOKIE_NAME] ?? null;
}

passport.use('jwt', new JwtStrategy(
    { jwtFromRequest: cookieExtractor, secretOrKey: SECRET, passReqToCallback: true },
    async (_req, payload, done) => {
        try {
            const session = await Session.findOne({ user: payload.sub });
            // Single-session enforcement: jti must match the stored active session
            if (!session || session.jti !== payload.jti) {
                return done(null, false);
            }
            return done(null, {
                id:    payload.sub,
                name:  payload.name,
                role:  payload.role,
                phone: payload.phone,
                jti:   payload.jti,
            });
        } catch (err) {
            return done(err);
        }
    }
));

// ─── Google OAuth skeleton ─────────────────────────────────────────────────────
// TODO: Implement Google OAuth.
// 1. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL to .env
// 2. Uncomment the block below and fill in the find-or-create logic
//
// if (process.env.GOOGLE_CLIENT_ID) {
//     const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
//     passport.use('google', new GoogleStrategy(
//         {
//             clientID:     process.env.GOOGLE_CLIENT_ID,
//             clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//             callbackURL:  process.env.GOOGLE_CALLBACK_URL,
//         },
//         async (accessToken, refreshToken, profile, done) => {
//             try {
//                 let user = await User.findOne({ googleId: profile.id });
//                 if (!user) {
//                     const email = profile.emails?.[0]?.value;
//                     user = await User.findOne({ email });
//                     if (user) {
//                         user.googleId = profile.id;
//                         user.provider = 'google';
//                         await user.save();
//                     } else {
//                         // Create new user + assign role
//                         user = await User.create({ ... });
//                     }
//                 }
//                 const userRol = await UserRol.findOne({ user: user._id }).populate('rol');
//                 return done(null, { user, rol: userRol.rol });
//             } catch (err) {
//                 return done(err);
//             }
//         }
//     ));
// }

module.exports = passport;
