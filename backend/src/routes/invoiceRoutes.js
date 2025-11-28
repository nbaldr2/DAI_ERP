const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middlewares/auth');
const { Invoice, Customer, Supplier, User } = require('../models');
const { Op } = require('sequelize');
const invoiceController = require('../controllers/invoiceController');

/**
 * @route   GET /api/invoices/next-number
 * @desc    Get the next invoice number
 * @access  Private
 */
router.get('/next-number', authenticateToken, invoiceController.getNextInvoiceNumber);

/**
 * @route   GET /api/invoices
 * @desc    List all invoices with filters
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { invoice_type, status, customer_id, supplier_id, date_from, date_to, page = 1, limit = 50 } = req.query;
    const where = {};

    if (invoice_type) where.invoice_type = invoice_type;
    if (status) where.status = status;
    if (customer_id) where.customer_id = customer_id;
    if (supplier_id) where.supplier_id = supplier_id;

    if (date_from || date_to) {
      where.invoice_date = {};
      if (date_from) where.invoice_date[Op.gte] = date_from;
      if (date_to) where.invoice_date[Op.lte] = date_to;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Invoice.findAndCountAll({
      where,
      include: [
        { model: Customer, as: 'customer', required: false },
        { model: Supplier, as: 'supplier', required: false },
        { model: User, as: 'creator', attributes: ['id', 'username', 'name'] }
      ],
      limit: parseInt(limit),
      offset,
      order: [['invoice_date', 'DESC'], ['id', 'DESC']]
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('List invoices error:', error);
    res.status(500).json({ success: false, message: 'Failed to list invoices', error: error.message });
  }
});

/**
 * @route   POST /api/invoices
 * @desc    Create new invoice
 * @access  Private (Admin, Sales, Accountant)
 */
router.post('/', authenticateToken, authorize('ADMIN', 'SALES', 'ACCOUNTANT'), async (req, res) => {
  // Delegate to controller to handle transactional creation of items, payments, attachments
  return invoiceController.createInvoice(req, res);
});

/**
 * @route   GET /api/invoices/:id
 * @desc    Get invoice by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { InvoiceItem, InvoicePayment, InvoiceAttachment, Product } = require('../models');
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Supplier, as: 'supplier' },
        { model: User, as: 'creator', attributes: ['id', 'username', 'name'] },
        {
          model: InvoiceItem,
          as: 'items',
          include: [
            { model: Product, as: 'product', attributes: ['id', 'name_en', 'name_ar', 'unit', 'category', 'origin'] }
          ]
        },
        { model: InvoicePayment, as: 'payments' },
        { model: InvoiceAttachment, as: 'attachments' }
      ]
    });

    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ success: false, message: 'Failed to get invoice', error: error.message });
  }
});

/**
 * @route   PUT /api/invoices/:id
 * @desc    Update invoice
 * @access  Private (Admin, Accountant)
 */
router.put('/:id', authenticateToken, authorize('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  // Delegate to controller to handle transactional update of items and related records
  return invoiceController.updateInvoice(req, res);
});

/**
 * @route   GET /api/invoices/:id/download
 * @desc    Download invoice as PDF
 * @access  Private
 */
router.get('/:id/download', authenticateToken, async (req, res) => {
  // Delegate to controller to generate and stream PDF
  return invoiceController.downloadInvoicePdf(req, res);
});

// Note: next-number route already defined at top via controller; remove duplicate implementation

module.exports = router;
