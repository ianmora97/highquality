const Joi = require('joi');
const jwt = require('jsonwebtoken');
const { COOKIE_NAME } = require('../helpers/token');

const NAME_PATTERN     = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s'\-]+$/;
const PHONE_PATTERN    = /^\d{8}$/;
const DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

const baseSchema = Joi.object({
    start: Joi.string().pattern(DATETIME_PATTERN).required()
        .messages({ 'string.pattern.base': 'Fecha de inicio inválida.' }),
    end: Joi.string().pattern(DATETIME_PATTERN).required()
        .messages({ 'string.pattern.base': 'Fecha de fin inválida.' }),
    extendedProps: Joi.object({
        servicios: Joi.array().items(Joi.string()).min(1).required()
            .messages({ 'array.min': 'Debes seleccionar al menos un servicio.' }),
        precio: Joi.number().integer().min(0).required(),
        numero: Joi.string().pattern(PHONE_PATTERN).required()
            .messages({ 'string.pattern.base': 'El número debe tener exactamente 8 dígitos.' }),
    }).required(),
    title: Joi.string().min(2).max(80).pattern(NAME_PATTERN).required()
        .messages({
            'string.min':          'El nombre debe tener al menos 2 caracteres.',
            'string.max':          'El nombre es demasiado largo.',
            'string.pattern.base': 'El nombre solo puede contener letras y espacios.',
        }),
}).unknown(true);

async function validateBooking(req, res, next) {
    const token  = req.cookies?.[COOKIE_NAME];
    const SECRET = process.env.JWT_SECRET || process.env.SECRET;

    if (token) {
        jwt.verify(token, SECRET, (err, decoded) => {
            if (!err && decoded.role === 'client' && decoded.name && decoded.phone) {
                // Trusted session — overwrite body with verified identity
                req.body.title = decoded.name;
                req.body.extendedProps = {
                    ...(req.body.extendedProps || {}),
                    numero: String(decoded.phone),
                };
                return validateFields(req, res, next);
            }
            // Expired or invalid token — clear and fall through to body validation
            res.clearCookie(COOKIE_NAME);
            validateFields(req, res, next);
        });
    } else {
        validateFields(req, res, next);
    }
}

function validateFields(req, res, next) {
    const { error } = baseSchema.validate(req.body, { abortEarly: true });
    if (error) return res.status(422).json({ error: error.details[0].message });
    // Sanitize phone: strip stray non-digits
    req.body.extendedProps.numero = req.body.extendedProps.numero.replace(/\D/g, '');
    next();
}

module.exports = { validateBooking };
