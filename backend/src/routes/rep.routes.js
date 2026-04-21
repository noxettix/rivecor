const router = require('express').Router();
const ctrl = require('../controllers/rep.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
router.use(authenticate);
router.get('/',       ctrl.getRecords);
router.get('/report', ctrl.getReport);
router.post('/',      authorize('ADMIN','OPERATOR'), ctrl.createRecord);
router.put('/:id',    authorize('ADMIN','OPERATOR'), ctrl.updateRecord);
module.exports = router;
