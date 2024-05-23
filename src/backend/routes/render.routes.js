const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
    res.render('client/index');
});

router.get('/reservar', async (req, res) => {
    res.render('client/reservar');
});

module.exports = router;