const router = require('express').Router();
const ctrl = require('../controllers/clients.controller');
// const { authenticate, authorize } = require('../middleware/auth.middleware');

// TEMPORAL: desactivamos auth para poder avanzar con el frontend
// router.use(authenticate, authorize('ADMIN'));

router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.deactivate);
router.post('/:id/reset-password', ctrl.resetPassword);
router.get('/:id/mechanics', ctrl.getMechanics);
router.post('/:id/mechanics', ctrl.assignMechanic);
router.delete('/:id/mechanics/:mechanicId', ctrl.removeMechanic);

module.exports = router;