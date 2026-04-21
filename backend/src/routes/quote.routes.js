// quote.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/quote.controller');
const { authenticate } = require('../middleware/auth.middleware');
router.use(authenticate);
router.post('/generate',        ctrl.generate);
router.get('/html/:equipmentId', ctrl.getHTML);
module.exports = router;
