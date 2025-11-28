const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const purchaseController = require('../controllers/purchaseController');
const { authenticateToken, authorize, checkPermission } = require('../middlewares/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route GET /api/purchases
 * @desc List purchases with pagination and filtering
 * @access Private (requires 'purchases:read' permission)
 */
router.get(
  '/',
  checkPermission('read', 'purchases'),
  purchaseController.listPurchases
);

/**
 * @route GET /api/purchases/:id
 * @desc Get purchase by ID
 * @access Private (requires 'purchases:read' permission)
 */
router.get(
  '/:id',
  checkPermission('read', 'purchases'),
  param('id').isInt().withMessage('Purchase ID must be an integer'),
  purchaseController.getPurchaseById
);

/**
 * @route POST /api/purchases
 * @desc Create a new purchase
 * @access Private (requires 'purchases:create' permission)
 */
router.post(
  '/',
  checkPermission('create', 'purchases'),
  [
    body('supplier_id').isInt().withMessage('Supplier ID must be an integer'),
    body('order_date').isDate().withMessage('Order date must be a valid date'),
    body('expected_date').optional().isDate().withMessage('Expected date must be a valid date'),
    body('status').optional().isIn(['DRAFT', 'SENT', 'CONFIRMED', 'RECEIVED', 'CLOSED', 'CANCELLED'])
      .withMessage('Status must be one of: DRAFT, SENT, CONFIRMED, RECEIVED, CLOSED, CANCELLED'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.product_id').isInt().withMessage('Product ID must be an integer'),
    body('items.*.qty').isFloat({ min: 0.01 }).withMessage('Quantity must be a positive number'),
    body('items.*.unit_price').isFloat({ min: 0 }).withMessage('Unit price must be a non-negative number'),
    body('items.*.warehouse_id').optional().isInt().withMessage('Warehouse ID must be an integer')
  ],
  purchaseController.createPurchase
);

/**
 * @route POST /api/purchases/:id/receive
 * @desc Receive a purchase and create stock entries
 * @access Private (requires 'purchases:update' permission)
 */
router.post(
  '/:id/receive',
  checkPermission('update', 'purchases'),
  [
    param('id').isInt().withMessage('Purchase ID must be an integer'),
    body('date_in').isDate().withMessage('date_in must be a valid date'),
    body('default_expiry_date').optional().isDate().withMessage('default_expiry_date must be a valid date'),
    body('receipts').isArray({ min: 1 }).withMessage('receipts array is required'),
    body('receipts.*.purchase_item_id').isInt().withMessage('purchase_item_id must be an integer'),
    body('receipts.*.accepted_weight').isFloat({ min: 0.01 }).withMessage('accepted_weight must be positive'),
    body('receipts.*.warehouse_id').optional().isInt().withMessage('warehouse_id must be an integer'),
    body('receipts.*.expiry_date').optional().isDate().withMessage('expiry_date must be a valid date'),
    body('receipts.*.pallets').optional().isInt({ min: 0 }).withMessage('pallets must be non-negative'),
    body('receipts.*.pallet_weight').optional().isFloat({ min: 0 }).withMessage('pallet_weight must be non-negative')
  ],
  purchaseController.receivePurchase
);

/**
 * @route PUT /api/purchases/:id
 * @desc Update a purchase (only DRAFT purchases)
 * @access Private (requires 'purchases:update' permission)
 */
router.put(
  '/:id',
  checkPermission('update', 'purchases'),
  [
    param('id').isInt().withMessage('Purchase ID must be an integer'),
    body('supplier_id').isInt().withMessage('Supplier ID must be an integer'),
    body('order_date').isDate().withMessage('Order date must be a valid date'),
    body('expected_date').optional().isDate().withMessage('Expected date must be a valid date'),
    body('status').optional().isIn(['DRAFT', 'SENT', 'CONFIRMED', 'RECEIVED', 'CLOSED', 'CANCELLED'])
      .withMessage('Status must be one of: DRAFT, SENT, CONFIRMED, RECEIVED, CLOSED, CANCELLED'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.product_id').isInt().withMessage('Product ID must be an integer'),
    body('items.*.qty').isFloat({ min: 0.01 }).withMessage('Quantity must be a positive number'),
    body('items.*.unit_price').isFloat({ min: 0 }).withMessage('Unit price must be a non-negative number'),
    body('items.*.warehouse_id').optional().isInt().withMessage('Warehouse ID must be an integer')
  ],
  purchaseController.updatePurchase
);

/**
 * @route PATCH /api/purchases/:id/status
 * @desc Update purchase status
 * @access Private (requires 'purchases:update' permission)
 */
router.patch(
  '/:id/status',
  checkPermission('update', 'purchases'),
  [
    param('id').isInt().withMessage('Purchase ID must be an integer'),
    body('status').isIn(['DRAFT', 'CONFIRMED', 'RECEIVED', 'CANCELLED'])
      .withMessage('Status must be one of: DRAFT, CONFIRMED, RECEIVED, CANCELLED'),
    body('notes').optional().isString().withMessage('Notes must be a string')
  ],
  purchaseController.updatePurchaseStatus
);

/**
 * @route DELETE /api/purchases/:id
 * @desc Delete purchase (only if in DRAFT status)
 * @access Private (requires 'purchases:delete' permission)
 */
router.delete(
  '/:id',
  checkPermission('delete', 'purchases'),
  param('id').isInt().withMessage('Purchase ID must be an integer'),
  purchaseController.deletePurchase
);

module.exports = router;