const express = require('express');
const router  = express.Router();
const Auth    = require('../controllers/auth.controller');
const { requireApi } = require('../middlewares/auth');

// Client auth
router.post('/client/login',    Auth.loginClient);
router.post('/client/register', Auth.registerClient);
router.post('/logout',          Auth.logout);
router.get('/me',               requireApi('client'), Auth.me);

// Google OAuth skeleton (not implemented)
router.get('/google',          Auth.googleStart);
router.get('/google/callback', Auth.googleCallback);

module.exports = router;
