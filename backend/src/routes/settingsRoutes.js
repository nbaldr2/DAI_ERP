const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const settingsController = require('../controllers/settingsController');
const { authenticateToken, authorize } = require('../middlewares/auth');

/**
 * @route   GET /api/settings
 * @desc    Get system settings
 * @access  Public
 */
router.get('/', settingsController.getSettings);

/**
 * @route   PUT /api/settings
 * @desc    Update system settings
 * @access  Private (Admin)
 */
router.put('/',
  authenticateToken,
  authorize('ADMIN'),
  [
    body('company_name').notEmpty().withMessage('Company name is required'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('cr_number').optional().matches(/^[0-9]+$/).withMessage('CR number must be numeric'),
    body('currency').optional().isLength({ min: 2, max: 5 }).withMessage('Currency must be 2-5 characters'),
    body('language').optional().isLength({ min: 2, max: 10 }).withMessage('Language must be 2-10 characters')
  ],
  settingsController.updateSettings
);

module.exports = router;