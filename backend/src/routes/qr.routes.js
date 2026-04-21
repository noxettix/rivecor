// qr.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/qr.controller');
const { authenticate } = require('../middleware/auth.middleware');
router.use(authenticate);
router.get('/tire/:id',      ctrl.getTireQR);
router.get('/equipment/:id', ctrl.getEquipmentQRs);
module.exports = router;
