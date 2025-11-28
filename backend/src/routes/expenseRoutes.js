const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const expenseController = require('../controllers/expenseController');
const { authenticateToken, checkPermission } = require('../middlewares/auth');

router.use(authenticateToken);

router.get('/', checkPermission('read', 'expenses'), expenseController.listExpenses);

router.get(
  '/:id',
  checkPermission('read', 'expenses'),
  param('id').isInt().withMessage('Expense ID must be an integer'),
  expenseController.getExpenseById
);

router.post(
  '/',
  checkPermission('create', 'expenses'),
  [
    body('expense_date').isISO8601().toDate().withMessage('Expense date must be a valid date'),
    body('category').notEmpty().withMessage('Category is required'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
    body('supplier_id').optional({ nullable: true }).isInt().withMessage('Supplier ID must be an integer'),
    body('status').optional().isIn(['PENDING', 'APPROVED', 'PAID', 'CANCELLED'])
  ],
  expenseController.createExpense
);

router.put(
  '/:id',
  checkPermission('update', 'expenses'),
  [
    param('id').isInt().withMessage('Expense ID must be an integer'),
    body('expense_date').optional().isISO8601().toDate().withMessage('Expense date must be a valid date'),
    body('amount').optional().isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
    body('supplier_id').optional({ nullable: true }).isInt().withMessage('Supplier ID must be an integer'),
    body('status').optional().isIn(['PENDING', 'APPROVED', 'PAID', 'CANCELLED'])
  ],
  expenseController.updateExpense
);

router.delete(
  '/:id',
  checkPermission('delete', 'expenses'),
  param('id').isInt().withMessage('Expense ID must be an integer'),
  expenseController.deleteExpense
);

module.exports = router;