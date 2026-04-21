const r = require('express').Router();
const c = require('../controllers/cost.controller');
const { authenticate } = require('../middleware/auth.middleware');
r.use(authenticate);
r.get('/tire/:tireId',           c.getTireCostPerKm);
r.get('/equipment/:equipmentId', c.getEquipmentCosts);
r.get('/company',                c.getCompanyCosts);
module.exports = r;
