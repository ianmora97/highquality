const express = require('express');
const router  = express.Router();
const { requirePage, attachUser } = require('../middlewares/auth');

// ─── Public pages ──────────────────────────────────────────────────────────────
router.get('/', (_req, res) => res.render('client/index', { tab: 'inicio' }));

router.get('/reservar', attachUser, (req, res) => {
    const u = req.user || null;
    res.render('client/reservar', {
        tab: 'reservar',
        // Pass both shapes for backward compat with reservar.hbs meta tags
        user:   u,
        client: u ? { nombre: u.name, numero: u.phone } : null,
    });
});

router.get('/galeria',   (_req, res) => res.render('client/gallery',   { tab: 'galeria' }));
router.get('/servicios', (_req, res) => res.render('client/servicios', { tab: 'servicios' }));

// ─── Client auth pages ─────────────────────────────────────────────────────────
router.get('/ingresar', (_req, res) => res.render('auth/client-login',    { layout: 'auth', title: 'Ingresar' }));
router.get('/registro', (_req, res) => res.render('auth/client-register', { layout: 'auth', title: 'Crear Cuenta' }));

// ─── Protected client area ─────────────────────────────────────────────────────
const guardClient = requirePage('client');

router.get('/app', guardClient, (req, res) => {
    res.render('app/index', { layout: 'app', tab: 'app', user: req.user, isApp: true });
});
router.get('/app/history', guardClient, (req, res) => {
    res.render('app/history', { layout: 'app', tab: 'history', user: req.user, isHistory: true });
});
router.get('/app/reviews', guardClient, (req, res) => {
    res.render('app/reviews', { layout: 'app', tab: 'reviews', user: req.user, isReviews: true });
});

module.exports = router;
