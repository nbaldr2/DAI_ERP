const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const systemSettingsController = require('../controllers/systemSettingsController');
const { authenticateToken, authorize } = require('../middlewares/auth');

/**
 * @route   GET /api/system-settings
 * @desc    Get current system settings
 * @access  Private (Admin)
 */
router.get('/',
  authenticateToken,
  authorize('ADMIN'),
  systemSettingsController.getSettings
);

/**
 * @route   PUT /api/system-settings
 * @desc    Update system settings
 * @access  Private (Admin)
 */
router.put('/',
  authenticateToken,
  authorize('ADMIN'),
  [
    body('company_name').notEmpty().withMessage('Company name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().withMessage('Phone is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('pobox').notEmpty().withMessage('PO Box is required'),
    body('cr_number').isNumeric().withMessage('CR number must be numeric'),
    body('logo_url').optional({ nullable: true }).isURL().withMessage('Logo URL must be a valid URL'),
    body('language').notEmpty().withMessage('Language is required'),
    body('currency').notEmpty().withMessage('Currency is required')
  ],
  systemSettingsController.updateSettings
);

module.exports = router;