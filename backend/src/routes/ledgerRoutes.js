const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const stockController = require('../controllers/stockController');
const { authenticateToken } = require('../middlewares/auth');

/**
 * @route   GET /api/ledger
 * @desc    Global ledger list with optional filters
 * @access  Private
 */
router.get('/',
  authenticateToken,
  stockController.listLedger
);

/**
 * @route   GET /api/ledger/:stock_entry_id
 * @desc    Get ledger entries for a specific stock entry
 * @access  Private
 */
router.get('/:stock_entry_id',
  authenticateToken,
  [
    param('stock_entry_id').isInt({ min: 1 }).withMessage('Valid stock entry ID is required')
  ],
  stockController.getLedger
);

module.exports = router;