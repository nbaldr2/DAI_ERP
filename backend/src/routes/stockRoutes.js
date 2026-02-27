const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const stockController = require('../controllers/stockController');
const stockAdjustmentController = require('../controllers/stockAdjustmentController');
const stockTransferController = require('../controllers/stockTransferController');
const { authenticateToken, authorize } = require('../middlewares/auth');
const { cacheMiddleware, incrementVersion } = require('../middlewares/cache');

/**
 * @route   GET /api/stock
 * @desc    List all stock entries with filters
 * @access  Private
 */
router.get('/',
  authenticateToken,
  cacheMiddleware('stock', 120), // Cache for 2 mins
  stockController.listStock
);

/**
 * @route   GET /api/stock/summary
 * @desc    Get stock summary by product and warehouse
 * @access  Private
 */
router.get('/summary',
  authenticateToken,
  cacheMiddleware('stock', 300), // Cache for 5 mins
  stockController.getStockSummary
);

/**
 * @route   GET /api/stock/balance
 * @desc    Get aggregated balance by product and warehouse
 * @access  Private
 */
router.get('/balance',
  authenticateToken,
  [
    query('product_id').isInt({ min: 1 }).withMessage('product_id is required and must be integer'),
    query('warehouse_id').isInt({ min: 1 }).withMessage('warehouse_id is required and must be integer')
  ],
  cacheMiddleware('stock', 300), // Cache for 5 mins
  stockController.getBalance
);

/**
 * @route   POST /api/stock
 * @desc    Create new stock entry (receipt)
 * @access  Private (Admin, Warehouse)
 */
router.post('/',
  authenticateToken,
  authorize('ADMIN', 'WAREHOUSE'),
  [
    body('purchase_id').optional().isInt({ min: 1 }).withMessage('purchase_id must be a positive integer'),
    body('product_id').isInt({ min: 1 }).withMessage('Valid product_id is required'),
    body('supplier_id').isInt({ min: 1 }).withMessage('Valid supplier_id is required'),
    body('warehouse_id').isInt({ min: 1 }).withMessage('Valid warehouse_id is required'),
    body('pallets').optional().isInt({ min: 0 }).withMessage('Pallets must be non-negative integer'),
    body('pallet_weight').isFloat({ min: 0.01 }).withMessage('Pallet weight must be positive'),
    body('total_weight').optional().isFloat({ min: 0.01 }).withMessage('Total weight must be positive'),
    body('received_weight').optional().isFloat({ min: 0 }).withMessage('received_weight must be non-negative'),
    body('accepted_weight').optional().isFloat({ min: 0 }).withMessage('accepted_weight must be non-negative'),
    body('date_in').isDate().withMessage('Valid date_in is required (YYYY-MM-DD)'),
    body('expiry_date').isDate().withMessage('Valid expiry_date is required (YYYY-MM-DD)'),
    body('status').optional().isIn(['PENDING', 'RECEIVED', 'INSPECTED', 'COMPLETED']).withMessage('Invalid status'),
    body('notes').optional().isString()
  ],
  async (req, res, next) => {
    await incrementVersion('stock');
    next();
  },
  stockController.createStock
);

/**
 * @route   GET /api/stock/:id
 * @desc    Get stock entry by ID
 * @access  Private
 */
router.get('/:id(\\d+)',
  authenticateToken,
  [
    param('id').isInt({ min: 1 }).withMessage('Valid stock entry ID is required')
  ],
  cacheMiddleware('stock', 120),
  stockController.getStockById
);

/**
 * @route   PUT /api/stock/:id
 * @desc    Update stock entry (optimistic locking)
 * @access  Private (Admin, Warehouse)
 */
router.put('/:id(\\d+)',
  authenticateToken,
  authorize('ADMIN', 'WAREHOUSE'),
  [
    param('id').isInt({ min: 1 }).withMessage('Valid stock entry ID is required'),
    body('version').optional().isInt({ min: 1 }).withMessage('Version must be a positive integer'),
    body('notes').optional().isString(),
    body('expiry_date').optional().isDate().withMessage('Valid expiry_date required (YYYY-MM-DD)'),
    body('status').optional().isIn(['PENDING', 'RECEIVED', 'INSPECTED', 'COMPLETED']).withMessage('Invalid status'),
    body('pallets').optional().isInt({ min: 0 }).withMessage('Pallets must be non-negative'),
    body('pallet_weight').optional().isFloat({ min: 0.01 }).withMessage('Pallet weight must be positive')
  ],
  async (req, res, next) => {
    await incrementVersion('stock');
    next();
  },
  stockController.updateStock
);

/**
 * @route   DELETE /api/stock/:id
 * @desc    Delete stock entry (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id(\\d+)',
  authenticateToken,
  authorize('ADMIN'),
  [
    param('id').isInt({ min: 1 }).withMessage('Valid stock entry ID is required')
  ],
  async (req, res, next) => {
    await incrementVersion('stock');
    next();
  },
  stockController.deleteStock
);

/**
 * @route   POST /api/stock/:id/waste
 * @desc    Record waste/damage for a specific stock entry
 * @access  Private (Admin, Warehouse)
 */
router.post('/:id(\\d+)/waste',
  authenticateToken,
  authorize('ADMIN', 'WAREHOUSE'),
  [
    param('id').isInt({ min: 1 }).withMessage('Valid stock entry ID is required'),
    body('waste_weight').isFloat({ min: 0.01 }).withMessage('waste_weight must be positive'),
    body('notes').optional().isString()
  ],
  async (req, res, next) => {
    await incrementVersion('stock');
    // Inject stock_entry_id from route param to body
    req.body.stock_entry_id = parseInt(req.params.id, 10);
    return stockController.createWaste(req, res, next);
  }
);

/**
 * @route   GET /api/stock/trends
 * @desc    Get stock trends by product over time
 * @access  Private
 */
router.get('/trends',
  authenticateToken,
  cacheMiddleware('stock', 3600), // Cache for 1 hour
  stockController.getStockTrends
);

/**
 * @route   GET /api/stock/adjustments
 * @desc    List stock adjustments
 * @access  Private
 */
router.get('/adjustments',
  authenticateToken,
  stockAdjustmentController.list
);

/**
 * @route   POST /api/stock/adjustments
 * @desc    Create stock adjustment (draft)
 * @access  Private (Admin, Warehouse)
 */
router.post('/adjustments',
  authenticateToken,
  authorize('ADMIN', 'WAREHOUSE'),
  [
    body('warehouse_id').isInt({ min: 1 }).withMessage('Valid warehouse_id is required'),
    body('reason').isString().notEmpty().withMessage('Reason is required'),
    body('date').optional().isDate(),
    body('items').isArray({ min: 1 }).withMessage('Items array is required')
  ],
  stockAdjustmentController.create
);

/**
 * @route   GET /api/stock/adjustments/:id
 * @desc    Get adjustment details
 * @access  Private
 */
router.get('/adjustments/:id(\\d+)',
  authenticateToken,
  stockAdjustmentController.getById
);

/**
 * @route   POST /api/stock/adjustments/:id/approve
 * @desc    Approve adjustment and update stock
 * @access  Private (Admin)
 */
router.post('/adjustments/:id(\\d+)/approve',
  authenticateToken,
  authorize('ADMIN'),
  stockAdjustmentController.approve
);

/**
 * @route   GET /api/stock/transfers
 * @desc    List stock transfers
 * @access  Private
 */
router.get('/transfers',
  authenticateToken,
  stockTransferController.list
);

/**
 * @route   POST /api/stock/transfers
 * @desc    Create stock transfer (draft)
 * @access  Private (Admin, Warehouse)
 */
router.post('/transfers',
  authenticateToken,
  authorize('ADMIN', 'WAREHOUSE'),
  [
    body('source_warehouse_id').isInt({ min: 1 }),
    body('destination_warehouse_id').isInt({ min: 1 }),
    body('items').isArray({ min: 1 })
  ],
  stockTransferController.create
);

/**
 * @route   GET /api/stock/transfers/:id
 * @desc    Get transfer details
 * @access  Private
 */
router.get('/transfers/:id(\\d+)',
  authenticateToken,
  stockTransferController.getById
);

/**
 * @route   PUT /api/stock/transfers/:id/status
 * @desc    Update transfer status (IN_TRANSIT, COMPLETED)
 * @access  Private (Admin, Warehouse)
 */
router.put('/transfers/:id(\\d+)/status',
  authenticateToken,
  authorize('ADMIN', 'WAREHOUSE'),
  stockTransferController.updateStatus
);

/**
 * @route   GET /api/ledger/:stock_entry_id
 * @desc    Get ledger entries for a stock entry
 * @access  Private
 */
router.get('/ledger/:stock_entry_id',
  authenticateToken,
  [
    param('stock_entry_id').isInt({ min: 1 }).withMessage('Valid stock entry ID is required')
  ],
  cacheMiddleware('stock', 60),
  stockController.getLedger
);

/**
 * @route   GET /api/stock/ledger
 * @desc    Global ledger list with optional filters
 * @access  Private
 */
router.get('/ledger',
  authenticateToken,
  cacheMiddleware('stock', 60),
  stockController.listLedger
);

module.exports = router;
