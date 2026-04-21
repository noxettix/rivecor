const router = require('express').Router();
const { getCalendar } = require('../controllers/calendar.controller');
const { authenticate } = require('../middleware/auth.middleware');
router.use(authenticate);
router.get('/', getCalendar);
module.exports = router;
