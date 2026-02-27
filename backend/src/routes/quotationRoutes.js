const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken);

router.post('/', quotationController.createQuotation);
router.get('/', quotationController.getQuotations);
router.get('/:id', quotationController.getQuotationById);
router.put('/:id', quotationController.updateQuotation);
router.patch('/:id/status', quotationController.updateQuotationStatus);
router.delete('/:id', quotationController.deleteQuotation);
router.post('/:id/convert', quotationController.convertToInvoice);

module.exports = router;
