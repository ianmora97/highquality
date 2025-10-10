const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
    res.render('client/index',{
        tab: 'inicio'
    });
});

router.get('/reservar', async (req, res) => {
    res.render('client/reservar',{
        tab: 'reservar'
    });
});

router.get('/galeria', async (req, res) => {
    res.render('client/gallery',{
        tab: 'galeria'
    });
});

router.get('/servicios', async (req, res) => {
    res.render('client/servicios',{
        tab: 'servicios'
    });
});

module.exports = router;