const router = require('express').Router();
const ctrl = require('../controllers/mechanic.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', authorize('ADMIN'), ctrl.getAll);
router.get('/:id', authorize('ADMIN'), ctrl.getById);

router.post('/', authorize('ADMIN'), ctrl.create);
router.put('/:id', authorize('ADMIN'), ctrl.update);
router.delete('/:id', authorize('ADMIN'), ctrl.deactivate);
router.post('/:id/reset-password', authorize('ADMIN'), ctrl.resetPassword);
router.post('/:id/assign-company', authorize('ADMIN'), ctrl.assignCompany);

module.exports = router;