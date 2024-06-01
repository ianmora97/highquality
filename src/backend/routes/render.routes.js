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
    res.render('client/index',{
        tab: 'galeria'
    });
});

module.exports = router;