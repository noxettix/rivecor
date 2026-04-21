const router = require('express').Router();
const multer = require('multer');
const ctrl = require('../controllers/tireCatalog.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
});

router.use(authenticate);

/**
 * Admin
 */
router.get('/admin/tire-catalog', authorize('ADMIN'), ctrl.getAll);
router.post('/admin/tire-catalog', authorize('ADMIN'), ctrl.createOne);
router.put('/admin/tire-catalog/:id', authorize('ADMIN'), ctrl.updateOne);
router.delete('/admin/tire-catalog/:id', authorize('ADMIN'), ctrl.deleteOne);
router.post(
  '/admin/tire-catalog/upload',
  authorize('ADMIN'),
  upload.single('file'),
  ctrl.uploadExcel
);

/**
 * Cliente/Admin/Operador - lectura
 */
router.get('/tire-catalog/search', ctrl.findCatalogMatch);

module.exports = router;