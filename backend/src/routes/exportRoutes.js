const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middlewares/auth');
const exportController = require('../controllers/exportController');

/**
 * @route   GET /api/export/:tableName
 * @desc    Export table data to CSV or JSON
 * @access  Private (Admin only)
 */
router.get('/:tableName', authenticateToken, authorize('ADMIN'), exportController.exportTable);

/**
 * @route   GET /api/export/:tableName/filtered
 * @desc    Export filtered table data to CSV or JSON
 * @access  Private (Admin only)
 */
router.get('/:tableName/filtered', authenticateToken, authorize('ADMIN'), exportController.exportFilteredData);

module.exports = router;