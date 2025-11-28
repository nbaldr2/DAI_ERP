const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const stockController = require('../controllers/stockController');
const { authenticateToken, authorize } = require('../middlewares/auth');

/**
 * @route   POST /api/waste
 * @desc    Create waste/damage entry (transactional with locking)
 * @access  Private (Admin, Warehouse)
 */
router.post('/',
  authenticateToken,
  authorize('ADMIN', 'WAREHOUSE'),
  [
    body('stock_entry_id').isInt({ min: 1 }).withMessage('Valid stock_entry_id is required'),
    body('waste_weight').isFloat({ min: 0.01 }).withMessage('Waste weight must be positive'),
    body('reason').optional().isIn(['WASTE','DAMAGE','HEALTH_TEST','SPOILED','OTHER']).withMessage('Invalid reason'),
    body('notes').optional().isString()
  ],
  stockController.createWaste
);

/**
 * @route   GET /api/waste
 * @desc    List all waste entries with filters
 * @access  Private
 */
router.get('/',
  authenticateToken,
  async (req, res) => {
    try {
      const { WasteDamage, StockEntry, Product, Warehouse, User } = require('../models');
      const { stock_entry_id, purchase_id, page = 1, limit = 50 } = req.query;

      const where = {};
      if (stock_entry_id) where.stock_entry_id = stock_entry_id;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Build include for StockEntry, optionally filtered by purchase_id
      const stockEntryInclude = {
        model: StockEntry,
        as: 'stock_entry',
        include: [
          { model: Product, as: 'product' },
          { model: Warehouse, as: 'warehouse' }
        ]
      };

      if (purchase_id) {
        stockEntryInclude.where = { purchase_id };
        stockEntryInclude.required = true; // inner join when filtering by purchase
      }

      const { count, rows } = await WasteDamage.findAndCountAll({
        where,
        include: [
          stockEntryInclude,
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'name', 'role']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset,
        distinct: true
      });

      res.status(200).json({
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
      console.error('List waste error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list waste entries',
        error: error.message
      });
    }
  }
);

/**
 * @route   DELETE /api/waste/:id
 * @desc    Delete a waste entry
 * @access  Private (Admin)
 */
router.delete('/:id', authenticateToken, authorize('ADMIN'), stockController.deleteWaste);

module.exports = router;
