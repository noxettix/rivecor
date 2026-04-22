const r = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const c = require('../controllers/fleet.controller');

r.use(authenticate);

r.get('/', c.getFleet);

module.exports = r;