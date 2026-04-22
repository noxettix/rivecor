const r = require('express').Router();
const c = require('../controllers/tracking.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

r.use(authenticate);

r.get(
  '/request/:requestId',
  authorize('CLIENT', 'ADMIN', 'OPERATOR'),
  c.getTrackingByRequest
);

r.put(
  '/request/:requestId/location',
  authorize('ADMIN', 'OPERATOR'),
  c.updateMechanicLocation
);

module.exports = r;