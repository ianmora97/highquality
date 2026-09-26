const express = require('express');
const router  = express.Router();
const { requireApi } = require('../middlewares/auth');
const { addProps }        = require('../middlewares/book');
const { validateBooking } = require('../middlewares/validateBooking');

const Horario       = require('../controllers/horario.controller');
const Admin         = require('../controllers/admin.controller');
const Client        = require('../controllers/client.controller');
const Event         = require('../controllers/event.controller');
const Services      = require('../controllers/services.controller');
const Special       = require('../controllers/special.controller');
const Reviews       = require('../controllers/review.controller');
const Gallery       = require('../controllers/gallery.controller');
const PaymentMethod = require('../controllers/paymentmethod.controller');
const Auth          = require('../controllers/auth.controller');
const Setting       = require('../controllers/setting.controller');

const { migrate } = require('../helpers/migrate');

// ─── Auth (unified) ───────────────────────────────────────────────────────────
router.use('/auth', require('./auth.routes'));

// Legacy client auth aliases (keep old paths working for reserva.js modal)
router.post('/client/auth/register', Auth.registerClient);
router.post('/client/auth/login',    Auth.loginClient);
router.post('/client/auth/logout',   Auth.logout);

// ─── Horario ──────────────────────────────────────────────────────────────────
router.get('/horario',        Horario.get);
router.post('/horario',       requireApi('admin'), Horario.create);
router.put('/horario/:id',    requireApi('admin'), Horario.update);
router.delete('/horario/:id', requireApi('admin'), Horario.delete);

// ─── Admin (users with staff role) ───────────────────────────────────────────
router.get('/admin',        requireApi('admin'), Admin.get);
router.post('/admin',       requireApi('admin'), Admin.create);
router.put('/admin/:id',    requireApi('admin'), Admin.update);
router.delete('/admin/:id', requireApi('admin'), Admin.delete);

// ─── Events ───────────────────────────────────────────────────────────────────
router.get('/event',              Event.get);
router.get('/event/month',        Event.getMonth);
router.get('/event/range',        Event.getRange);
router.get('/event/ics',          Event.getIcs);
router.get('/event/client',       requireApi('client'), Event.getByClient);
router.post('/event',             requireApi('admin'),  Event.create);
router.post('/event/book',        validateBooking, addProps, Event.createClient);
router.put('/event/:id',          requireApi('admin'),  Event.update);
router.delete('/event/:id',       requireApi('admin'),  Event.delete);
router.put('/event/:id/pagar',    requireApi('admin'),  Event.pagar);

// ─── Services ─────────────────────────────────────────────────────────────────
router.get('/services',           Services.get);
router.get('/services/icons',     Services.getIcons);
router.post('/services',          requireApi('admin'),  Services.create);
router.put('/services/:id',       requireApi('admin'),  Services.update);
router.delete('/services/:id',    requireApi('admin'),  Services.delete);
router.post('/services/:id/image',requireApi('admin'),  Services.uploadMiddleware, Services.uploadImage);

// ─── Clients (CRUD — admin only) ──────────────────────────────────────────────
router.get('/client',          Client.get);
router.get('/client/lookup',   Client.lookup);
router.post('/client',         requireApi('admin'), Client.create);
router.put('/client/:id',      requireApi('admin'), Client.update);
router.delete('/client/:id',   requireApi('admin'), Client.delete);

// ─── Reviews ──────────────────────────────────────────────────────────────────
router.get('/review',           Reviews.get);
router.get('/review/display',   Reviews.getDisplay);
router.post('/review',          Reviews.create);
router.post('/review/test',     Reviews.test);
router.put('/review/:id',       requireApi('admin'), Reviews.update);
router.delete('/review/:id',    requireApi('admin'), Reviews.delete);

// ─── Specials / overrides ─────────────────────────────────────────────────────
router.get('/special',           Special.get);
router.get('/special/check',     Special.check);
router.post('/special',          requireApi('admin'), Special.create);
router.put('/special/:id',       requireApi('admin'), Special.update);
router.delete('/special/:id',    requireApi('admin'), Special.delete);

router.get('/citas/test', migrate);

// ─── Payment methods ──────────────────────────────────────────────────────────
router.get('/payment-method',      PaymentMethod.getEnabled);
router.get('/payment-method/all',  requireApi('admin'), PaymentMethod.getAll);
router.post('/payment-method',     requireApi('admin'), PaymentMethod.create);
router.put('/payment-method/:id',  requireApi('admin'), PaymentMethod.update);
router.delete('/payment-method/:id', requireApi('admin'), PaymentMethod.delete);

// ─── Settings ─────────────────────────────────────────────────────────────────
router.get('/settings', requireApi('admin'), Setting.get);
router.put('/settings', requireApi('admin'), Setting.update);

// ─── Gallery ──────────────────────────────────────────────────────────────────
router.get('/gallery',          Gallery.get);
router.post('/gallery',         requireApi('admin'), Gallery.uploadMiddleware, Gallery.upload);
router.put('/gallery/:id',      requireApi('admin'), Gallery.update);
router.delete('/gallery/:id',   requireApi('admin'), Gallery.delete);

module.exports = router;
