const router = require('express').Router();
const ctrl   = require('../controllers/stock.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/',              ctrl.getAll);
router.get('/available',     ctrl.getAvailable);
router.get('/next-code',     ctrl.nextCode);
router.get('/:id',           ctrl.getById);

router.post('/',                authorize('ADMIN','OPERATOR'), ctrl.create);
router.post('/:id/install',     authorize('ADMIN','OPERATOR'), ctrl.install);
router.post('/:id/withdraw',    authorize('ADMIN','OPERATOR'), ctrl.withdraw);
router.post('/:id/start-repair',authorize('ADMIN','OPERATOR'), ctrl.startRepair);
router.post('/:id/finish-repair',authorize('ADMIN','OPERATOR'), ctrl.finishRepair);
router.post('/:id/scrap',       authorize('ADMIN','OPERATOR'), ctrl.scrap);

module.exports = router;
