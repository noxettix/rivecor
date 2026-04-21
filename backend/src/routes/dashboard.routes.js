const r = require('express').Router();
const c = require('../controllers/dashboard.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

r.use(authenticate);

r.get('/client', authorize('CLIENT', 'ADMIN', 'OPERATOR'), c.clientDashboard);
r.get('/admin', authorize('ADMIN', 'OPERATOR'), c.adminDashboard);

module.exports = r;