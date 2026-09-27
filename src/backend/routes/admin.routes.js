const express = require('express');
const router  = express.Router();

const { requirePage } = require('../middlewares/auth');
const { wrapAll } = require('../helpers/asyncHandler');
const Auth  = wrapAll(require('../controllers/auth.controller'));
const Admin = wrapAll(require('../controllers/admin.controller'));

// Auth pages
router.get('/',       (_req, res) => res.render('auth/admin-login', { layout: 'auth', title: 'Admin' }));
router.post('/login', Auth.loginStaff);

// Protected panel pages — require admin or su
const guard = requirePage('admin');

router.get('/panel', guard, (req, res) => {
    res.render('admin/index', { layout: 'admin', user: req.user, tab: 'panel' });
});
router.get('/servicios', guard, (req, res) => {
    res.render('admin/servicios', { layout: 'admin', user: req.user, tab: 'servicios' });
});
router.get('/horarios', guard, (req, res) => {
    res.render('admin/horarios', { layout: 'admin', user: req.user, tab: 'horarios' });
});
router.get('/clientes', guard, (req, res) => {
    res.render('admin/clients', { layout: 'admin', user: req.user, tab: 'clientes' });
});
router.get('/reviews', guard, (req, res) => {
    res.render('admin/reviews', { layout: 'admin', user: req.user, tab: 'reviews' });
});
router.get('/overrides', guard, (req, res) => {
    res.render('admin/overrides', { layout: 'admin', user: req.user, tab: 'overrides' });
});
router.get('/galeria', guard, (req, res) => {
    res.render('admin/galeria', { layout: 'admin', user: req.user, tab: 'galeria' });
});
router.get('/configuracion', guard, (req, res) => {
    res.render('admin/settings', { layout: 'admin', user: req.user, tab: 'configuracion' });
});

module.exports = router;
