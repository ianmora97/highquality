const express = require('express');
const router = express.Router();
const { verify } = require('../middlewares/auth');
const Horario = require('../controllers/horario.controller');
const Admin = require('../controllers/admin.controller');
const Event = require('../controllers/event.controller');

/**
 * @routes /api/v1/horario
 * @description Rutas para el CRUD de horario
 * @access Private 
 */
router.get('/horario', verify, Horario.get);
router.post('/horario', verify, Horario.create);
router.put('/horario/:id', verify, Horario.update);
router.delete('/horario/:id', verify, Horario.delete);

/**
 * @routes /api/v1/admin
 * @description Rutas para el CRUD de admin
 * @access Private 
 */
router.get('/admin', verify, Admin.get);
router.post('/admin', verify, Admin.create);
router.put('/admin/:id', verify, Admin.update);
router.delete('/admin/:id', verify, Admin.delete);

/**
 * @routes /api/v1/event
 * @description Rutas para el CRUD de event
 * @access Private 
 */
router.get('/event', Event.get);
router.post('/event', verify, Event.create);
router.put('/event/:id', verify, Event.update);
router.delete('/event/:id', verify, Event.delete);

module.exports = router;