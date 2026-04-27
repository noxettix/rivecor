const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reports.controller');
const { authenticate } = require('../middleware/auth.middleware');

// 🔐 proteger rutas
router.use(authenticate);

// 🔥 RUTA PRINCIPAL (esto faltaba)
router.get('/', ctrl.downloadFull);

// rutas específicas
router.get('/full', ctrl.downloadFull);
router.get('/tires', ctrl.downloadTires);
router.get('/history', ctrl.downloadHistory);
router.get('/costs', ctrl.downloadCosts);
router.get('/mechanics', ctrl.downloadMechanics);

module.exports = router;