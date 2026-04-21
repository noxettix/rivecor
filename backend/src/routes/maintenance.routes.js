const r = require('express').Router();
const c = require('../controllers/maintenance.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

r.use(authenticate);

// consultas
r.get('/requests', c.getRequests);
r.get('/requests/pending', c.getPendingRequests);
r.get('/requests/my-history', c.getMyRequestHistory);
r.get('/history', c.getHistory);
r.get('/my-jobs', authorize('ADMIN', 'OPERATOR'), c.getMyJobsHistory);

// creación
r.post('/requests', c.createRequest);
r.post('/forms/pre', authorize('ADMIN', 'OPERATOR'), c.createFormPre);

// cambios de estado
r.put('/requests/:id/accept', authorize('ADMIN', 'OPERATOR'), c.acceptRequest);
r.put('/requests/:id/en-route', authorize('ADMIN', 'OPERATOR'), c.markRequestEnRoute);
r.put('/requests/:id/complete', authorize('ADMIN', 'OPERATOR'), c.completeRequest);
r.put('/requests/:id/status', authorize('ADMIN', 'OPERATOR'), c.updateRequestStatus);

// evaluación
r.put('/requests/:id/rate', c.rateRequest);

module.exports = r;