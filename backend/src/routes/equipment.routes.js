// equipment.routes.js
const r = require('express').Router();
const c = require('../controllers/equipment.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
r.use(authenticate);
r.get('/', c.getAll); r.get('/:id', c.getById);
r.post('/', authorize('ADMIN','OPERATOR'), c.create);
r.put('/:id', authorize('ADMIN','OPERATOR'), c.update);
module.exports = r;
