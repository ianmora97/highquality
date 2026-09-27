const express = require('express');
const router  = express.Router();
const { requirePage, attachUser } = require('../middlewares/auth');
const { asyncHandler } = require('../helpers/asyncHandler');
const Gallery = require('../models/gallery/gallery.model');
const Setting = require('../models/setting/setting.schema');

// Shown on /galeria only while the Gallery collection is empty, so a fresh
// install never renders a blank page.
const GALLERY_FALLBACK = [
    '/images/cortes/1.jpg', '/images/cortes/2.jpg', '/images/cortes/3.jpg',
    '/images/cortes/4.jpg', '/images/cortes/5.jpg', '/images/cortes/6.jpg',
    '/images/cortes/7.jpg', '/images/cortes/taper_fade.jpeg',
    '/images/cortes/corte1.jpg', '/images/cortes/corte2.jpg',
    '/images/cortes/corte3.jpg', '/images/cortes/corteybarba.jpeg',
];

// ─── Public pages ──────────────────────────────────────────────────────────────
// The homepage carousel shows the 6 newest gallery photos. Same server-rendered
// treatment as /galeria, and the same fallback when the collection is empty.
const HOME_CAROUSEL_COUNT = 6;

router.get('/', asyncHandler(async (_req, res) => {
    const [fotos, site] = await Promise.all([
        Gallery.get({ visible: true, limit: HOME_CAROUSEL_COUNT }),
        // Contact links + the plain-text horario block, edited in /dashboard/configuracion
        Setting.publicInfo(),
    ]);
    res.render('client/index', {
        tab: 'inicio',
        site,
        fotos,
        hasFotos: fotos.length > 0,
        staticFallback: GALLERY_FALLBACK.slice(0, HOME_CAROUSEL_COUNT),
    });
}));

router.get('/reservar', attachUser, (req, res) => {
    const u = req.user || null;
    res.render('client/reservar', {
        tab: 'reservar',
        // Pass both shapes for backward compat with reservar.hbs meta tags
        user:   u,
        client: u ? { nombre: u.name, numero: u.phone } : null,
    });
});

// Rendered server-side: the photos are in the HTML, so the grid never flashes
// empty and the images stay crawlable. `fotos` empty → the view falls back to
// the bundled /images/cortes set.
// The public services page was removed; services now live only in the homepage
// section. Redirect instead of 404 so existing links and bookmarks still land.
router.get('/servicios', (_req, res) => res.redirect(301, '/#servicios'));

router.get('/galeria', asyncHandler(async (_req, res) => {
    const fotos = await Gallery.get({ visible: true });
    res.render('client/gallery', {
        tab: 'galeria',
        fotos,
        hasFotos: fotos.length > 0,
        staticFallback: GALLERY_FALLBACK,
    });
}));

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
