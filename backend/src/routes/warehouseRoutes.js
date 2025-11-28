const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middlewares/auth');
const { Warehouse, StockEntry, Product, Purchase } = require('../models');
const { Op } = require('sequelize');

/**
 * @route   GET /api/warehouses
 * @desc    List all warehouses
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Warehouse.findAndCountAll({
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
    res.status(500).json({ success: false, message: 'Failed to list warehouses', error: error.message });
  }
});

/**
 * @route   POST /api/warehouses
 * @desc    Create new warehouse
 * @access  Private (Admin)
 */
router.post('/', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const warehouse = await Warehouse.create(req.body);
    res.status(201).json({ success: true, message: 'Warehouse created successfully', data: warehouse });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create warehouse', error: error.message });
  }
});

/**
 * @route   GET /api/warehouses/:id
 * @desc    Get warehouse by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id);
    if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found' });
    res.json({ success: true, data: warehouse });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get warehouse', error: error.message });
  }
});

/**
 * @route   PUT /api/warehouses/:id
 * @desc    Update warehouse
 * @access  Private (Admin)
 */
router.put('/:id', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id);
    if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found' });
    await warehouse.update(req.body);
    res.json({ success: true, message: 'Warehouse updated successfully', data: warehouse });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update warehouse', error: error.message });
  }
});

/**
 * @route   DELETE /api/warehouses/:id
 * @desc    Delete warehouse (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id);
    if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found' });
    await warehouse.destroy();
    res.json({ success: true, message: 'Warehouse deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete warehouse', error: error.message });
  }
});

/**
 * @route   GET /api/warehouses/:id/products
 * @desc    Get all products in a specific warehouse
 * @access  Private
 */
router.get('/:id/products', authenticateToken, async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id, {
      include: [{
        model: StockEntry,
        as: 'stock_entries',
        include: [
          {
            model: Product,
            as: 'product'
          },
          {
            model: Purchase,
            as: 'purchase',
            attributes: ['id', 'po_number']
          }
        ]
      }],
      order: [[{ model: StockEntry, as: 'stock_entries' }, 'date_in', 'DESC']]
    });

    if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found' });

    res.json({ success: true, data: warehouse.stock_entries });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get products for warehouse', error: error.message });
  }
});

module.exports = router;
