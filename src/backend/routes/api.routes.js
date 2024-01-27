const express = require('express');
const router = express.Router();
const { verify } = require('../middlewares/auth');
const Horario = require('../controllers/horario.controller');
const Admin = require('../controllers/admin.controller');
const Event = require('../controllers/event.controller');
const Services = require('../controllers/services.controller');
const Special = require('../controllers/special.controller');

/**
 * @routes /api/v1/horario
 * @description Rutas para el CRUD de horario
 * @access Private 
 */
router.get('/horario', Horario.get);
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

/**
 * @routes /api/v1/services
 * @description Rutas para el CRUD de services
 * @access Private 
 */
router.get('/services', Services.get);
router.get('/services/icons', Services.getIcons);
router.post('/services', verify, Services.create);
router.put('/services/:id', verify, Services.update);
router.delete('/services/:id', verify, Services.delete);

/**
 * @routes /api/v1/special
 * @description Rutas para el CRUD de special
 * @access Private 
 */
router.get('/special', Special.get);
router.post('/special', verify, Special.create);
router.put('/special/:id', verify, Special.update);
router.delete('/special/:id', verify, Special.delete);


module.exports = router;