const express = require('express');
const router = express.Router();

const { cipherPassword, verify } = require('../middlewares/auth');
const Admin = require('../controllers/admin.controller');

router.get('/', async (req, res) => {
    res.render('admin/login');
});
router.post('/login', cipherPassword, Admin.auth);

router.get('/panel', verify, async (req, res) => {
    res.render('admin/index',{
        layout: 'admin',
        user: req.user,
        tab: 'panel'
    });
});

router.get('/servicios', verify, async (req, res) => {
    res.render('admin/servicios',{
        layout: 'admin',
        user: req.user,
        tab: 'servicios'
    });
});
router.get('/horarios', verify, async (req, res) => {
    res.render('admin/horarios',{
        layout: 'admin',
        user: req.user,
        tab: 'horarios'
    });
});

module.exports = router;