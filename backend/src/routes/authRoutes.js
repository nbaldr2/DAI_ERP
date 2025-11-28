const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken, authorize } = require('../middlewares/auth');

/**
 * @route   POST /api/auth/login
 * @desc    User login
 * @access  Public
 */
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], authController.login);

/**
 * @route   POST /api/auth/register
 * @desc    Register new user (Admin only)
 * @access  Private (Admin)
 */
router.post('/register',
  authenticateToken,
  authorize('ADMIN'),
  [
    body('username').notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 100 }).withMessage('Username must be 3-100 characters'),
    body('password').notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    body('role').optional().isIn(['ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTANT', 'VIEWER'])
      .withMessage('Invalid role')
  ],
  authController.register
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get('/me', authenticateToken, authController.getCurrentUser);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password
 * @access  Private
 */
router.post('/change-password',
  authenticateToken,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').notEmpty().withMessage('New password is required')
      .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ],
  authController.changePassword
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
