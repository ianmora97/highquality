const express = require('express');
const router  = express.Router();
const { requireApi } = require('../middlewares/auth');
const { addProps }        = require('../middlewares/book');
const { validateBooking, validateSlot } = require('../middlewares/validateBooking');
const { asyncHandler, wrapAll } = require('../helpers/asyncHandler');

const Horario       = wrapAll(require('../controllers/horario.controller'));
const Admin         = wrapAll(require('../controllers/admin.controller'));
const Client        = wrapAll(require('../controllers/client.controller'));
const Event         = wrapAll(require('../controllers/event.controller'));
const Services      = wrapAll(require('../controllers/services.controller'));
const Special       = wrapAll(require('../controllers/special.controller'));
const Reviews       = wrapAll(require('../controllers/review.controller'));
const Gallery       = wrapAll(require('../controllers/gallery.controller'));
const PaymentMethod = wrapAll(require('../controllers/paymentmethod.controller'));
const Auth          = wrapAll(require('../controllers/auth.controller'));
const Setting       = wrapAll(require('../controllers/setting.controller'));

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
router.post('/event/book',        asyncHandler(validateBooking), asyncHandler(validateSlot), asyncHandler(addProps), Event.createClient);
router.put('/event/pagar-dia',    requireApi('admin'),  Event.pagarHoy);
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
router.get('/client/lookup',          Client.lookup);
router.get('/client',                 requireApi('admin'), Client.get);
router.get('/client/:id',             requireApi('admin'), Client.getOne);
router.get('/client/:id/citas',       requireApi('admin'), Client.getHistory);
router.post('/client',                requireApi('admin'), Client.create);
router.put('/client/:id',             requireApi('admin'), Client.update);
router.delete('/client/:id/account',  requireApi('admin'), Client.deleteAccount);
router.delete('/client/:id',          requireApi('admin'), Client.delete);

// ─── Reviews ──────────────────────────────────────────────────────────────────
router.get('/review',                requireApi('admin'),  Reviews.list);      // paginated queue
router.get('/review/display',                               Reviews.getDisplay); // public, approved only
router.get('/review/mine',           requireApi('client'), Reviews.mine);
router.post('/review',               requireApi('client'), Reviews.create);
router.patch('/review/:id/approve',  requireApi('admin'),  Reviews.approve);
router.patch('/review/:id/reject',   requireApi('admin'),  Reviews.reject);
router.patch('/review/:id/reply',    requireApi('admin'),  Reviews.reply);
router.delete('/review/:id',         requireApi('admin'),  Reviews.delete);

// ─── Specials / overrides ─────────────────────────────────────────────────────
router.get('/special',           Special.get);
router.get('/special/check',     Special.check);
router.post('/special',          requireApi('admin'), Special.create);
router.put('/special/:id',       requireApi('admin'), Special.update);
router.delete('/special/:id',    requireApi('admin'), Special.delete);

router.get('/citas/test', asyncHandler(migrate));

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
// GET /gallery is the public feed (visible rows only); the admin grid needs the
// hidden ones too, hence the separate /gallery/all.
router.get('/gallery',            Gallery.get);
router.get('/gallery/all',        requireApi('admin'), Gallery.getAll);
router.get('/gallery/aspects',    requireApi('admin'), Gallery.aspects);
router.post('/gallery',           requireApi('admin'), Gallery.uploadMiddleware, Gallery.upload);
router.post('/gallery/preview',   requireApi('admin'), Gallery.uploadMiddleware, Gallery.preview);
router.put('/gallery/reorder',    requireApi('admin'), Gallery.reorder);
router.put('/gallery/:id',        requireApi('admin'), Gallery.update);
router.delete('/gallery/:id',     requireApi('admin'), Gallery.delete);

module.exports = router;
