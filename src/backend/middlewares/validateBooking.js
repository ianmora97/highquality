const Joi = require('joi');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const { COOKIE_NAME } = require('../helpers/token');
const HorarioSchema = require('../models/horario/horario.schema');
const SpecialSchema = require('../models/special/special.schema');
const EventSchema = require('../models/events/event.schema');
const { hydrateHorario, isSlotAllowed } = require('../helpers/slots');

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
            if (err) {
                // Expired or tampered token — drop it and fall back to the body.
                res.clearCookie(COOKIE_NAME);
                return validateFields(req, res, next);
            }

            if (decoded.role === 'client' && decoded.name && decoded.phone) {
                // Trusted session — overwrite body with verified identity
                req.body.title = decoded.name;
                req.body.extendedProps = {
                    ...(req.body.extendedProps || {}),
                    numero: String(decoded.phone),
                };
                return validateFields(req, res, next);
            }

            // Valid token that is not a client session (the barber booking from
            // the public page, for example). The booking is treated as
            // anonymous, but their session must survive it — clearing the
            // cookie here used to log the admin out of the dashboard.
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

// The slot grid the client renders can be stale (schedule edited, someone booked
// first), so the same rules are enforced here before the event is created.
async function validateSlot(req, res, next) {
    try {
        const start = moment(req.body.start, 'YYYY-MM-DD HH:mm:ss', true);
        if (!start.isValid()) return res.status(422).json({ error: 'Fecha de inicio inválida.' });
        if (start.isBefore(moment())) {
            return res.status(409).json({ error: 'Esa hora ya pasó. Elige otra.' });
        }

        const doc = await HorarioSchema.findOne({ day: start.locale('en').format('dddd') }).lean();
        const horario = doc ? hydrateHorario(doc) : null;
        if (!horario || !horario.enable || !horario.blocks.length) {
            return res.status(409).json({ error: 'No atendemos ese día.' });
        }

        const sameDay = start.isSame(moment(), 'day');
        if (!isSlotAllowed(horario.blocks, start.format('HH:mm'), sameDay)) {
            return res.status(409).json({ error: 'Esa hora no está disponible. Elige otra.' });
        }

        const special = await SpecialSchema.findOne({
            start: { $lte: start.clone().endOf('day').toDate() },
            end:   { $gte: start.clone().startOf('day').toDate() },
        }).lean();
        if (special) {
            return res.status(409).json({ error: special.title || 'Día no disponible.' });
        }

        const taken = await EventSchema.findOne({ start: start.toDate() }).lean();
        if (taken) {
            return res.status(409).json({ error: 'Esa hora acaba de ser reservada. Elige otra.' });
        }

        next();
    } catch (err) {
        res.status(500).json({ error: 'No se pudo validar la cita. Intenta de nuevo.' });
    }
}

module.exports = { validateBooking, validateSlot };
