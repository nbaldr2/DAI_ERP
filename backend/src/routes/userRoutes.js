const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticateToken, authorize } = require('../middlewares/auth');
const userController = require('../controllers/userController');

// Admin-only routes
router.use(authenticateToken, authorize('ADMIN'));

/**
 * @route   GET /api/users
 * @desc    List users with search and pagination
 * @access  Private (Admin)
 */
router.get('/', userController.list);

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Private (Admin)
 */
router.post(
  '/',
  [
    body('username').notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 100 }).withMessage('Username must be 3-100 characters'),
    body('password').notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    body('role').optional().isIn(['ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTANT', 'VIEWER']).withMessage('Invalid role')
  ],
  userController.create
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update existing user (username/name/role/password)
 * @access  Private (Admin)
 */
router.put(
  '/:id',
  [
    param('id').isInt().withMessage('User ID must be an integer'),
    body('username').optional().isLength({ min: 3, max: 100 }).withMessage('Username must be 3-100 characters'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('role').optional().isIn(['ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTANT', 'VIEWER']).withMessage('Invalid role')
  ],
  userController.update
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  [param('id').isInt().withMessage('User ID must be an integer')],
  userController.remove
);

module.exports = router;