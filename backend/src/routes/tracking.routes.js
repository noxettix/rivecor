const router = require('express').Router();

const {
  updateLocation,
  getTrackingByRequest,
} = require('../controllers/tracking.controller');

const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get(
  '/maintenance/requests/:id/tracking',
  authenticate,
  authorize('CLIENT', 'ADMIN', 'OPERATOR', 'MECHANIC'),
  getTrackingByRequest
);

router.put(
  '/maintenance/requests/:id/location',
  authenticate,
  authorize('ADMIN', 'OPERATOR', 'MECHANIC'),
  updateLocation
);

module.exports = router;