const router = require('express').Router();
const { updateLocation, getTrackingByRequest } = require('../controllers/tracking.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Cliente, admin o mecánico pueden ver tracking
router.get(
  '/maintenance/requests/:id/tracking',
  authenticate,
  authorize('CLIENT', 'ADMIN', 'OPERATOR'),
  getTrackingByRequest
);

// Solo mecánico/admin actualiza ubicación GPS
router.put(
  '/maintenance/requests/:id/location',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  updateLocation
);

module.exports = router;