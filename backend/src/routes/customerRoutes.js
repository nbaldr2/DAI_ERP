const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middlewares/auth');
const { Customer } = require('../models');
const { Op } = require('sequelize');

/**
 * @route   GET /api/customers
 * @desc    List all customers with filters
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, type, page = 1, limit = 50 } = req.query;
    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { contact: { [Op.like]: `%${search}%` } }
      ];
    }

    if (type) where.type = type;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Customer.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['name', 'ASC']]
    });

    res.json({
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
    res.status(500).json({ success: false, message: 'Failed to list customers', error: error.message });
  }
});

/**
 * @route   POST /api/customers
 * @desc    Create new customer
 * @access  Private (Admin, Sales)
 */
router.post('/', authenticateToken, authorize('ADMIN', 'SALES'), async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json({ success: true, message: 'Customer created successfully', data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create customer', error: error.message });
  }
});

/**
 * @route   GET /api/customers/:id
 * @desc    Get customer by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get customer', error: error.message });
  }
});

/**
 * @route   PUT /api/customers/:id
 * @desc    Update customer
 * @access  Private (Admin, Sales)
 */
router.put('/:id', authenticateToken, authorize('ADMIN', 'SALES'), async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    await customer.update(req.body);
    res.json({ success: true, message: 'Customer updated successfully', data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update customer', error: error.message });
  }
});

/**
 * @route   DELETE /api/customers/:id
 * @desc    Delete customer (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    await customer.destroy();
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete customer', error: error.message });
  }
});

module.exports = router;
