const express = require('express');
const router = express.Router();

const invoiceController = require('../controllers/invoice.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Listado y detalle
router.get('/', authenticate, invoiceController.getAll);
router.get('/:id', authenticate, invoiceController.getById);

// Crear y autogenerar
router.post('/', authenticate, invoiceController.create);
router.post('/auto/:companyId', authenticate, invoiceController.autoGenerate);

// Editar / estado / envío
router.put('/:id', authenticate, invoiceController.update);
router.put('/:id/status', authenticate, invoiceController.updateStatus);
router.post('/:id/send', authenticate, invoiceController.send);

// Vista HTML y PDF
router.get('/:id/preview', authenticate, invoiceController.preview);
router.get('/:id/pdf', authenticate, invoiceController.pdf);

module.exports = router;