const r = require('express').Router();
const c = require('../controllers/maintenanceForm.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
r.use(authenticate);
r.get('/',             c.getForms);
r.get('/:id',          c.getForm);
r.post('/pre',         authorize('ADMIN','OPERATOR'), c.createPreVisit);
r.put('/:id/complete', authorize('ADMIN','OPERATOR'), c.completeVisit);
module.exports = r;
