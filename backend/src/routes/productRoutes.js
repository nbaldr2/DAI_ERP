const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticateToken, authorize } = require('../middlewares/auth');
const { Product } = require('../models');
const { Op } = require('sequelize');

/**
 * @route   GET /api/products
 * @desc    List all products with filters
 * @access  Private
 */
router.get('/',
  authenticateToken,
  async (req, res) => {
    try {
      const { search, category, page = 1, limit = 50 } = req.query;
      const where = {};

      if (search) {
        where[Op.or] = [
          { name_en: { [Op.like]: `%${search}%` } },
          { name_ar: { [Op.like]: `%${search}%` } }
        ];
      }

      if (category) {
        where.category = category;
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows } = await Product.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [['name_en', 'ASC']]
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
      console.error('List products error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list products',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/products
 * @desc    Create new product
 * @access  Private (Admin, Warehouse)
 */
router.post('/',
  authenticateToken,
  authorize('ADMIN', 'WAREHOUSE'),
  [
    body('name_en').notEmpty().withMessage('English name is required'),
    body('name_ar').optional().isString(),
    body('category').optional().isString(),
    body('origin').optional().isString(),
    body('unit').optional().isString(),
    body('min_qty').optional().isFloat({ min: 0 }),
    body('expiry_alert_days').optional().isInt({ min: 0 }),
    body('price_per_unit').isFloat({ min: 0 }).withMessage('Price per unit must be non-negative')
  ],
  async (req, res) => {
    try {
      const product = await Product.create(req.body);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product
      });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create product',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID
 * @access  Private
 */
router.get('/:id',
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const product = await Product.findByPk(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      res.status(200).json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get product',
        error: error.message
      });
    }
  }
);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product
 * @access  Private (Admin, Warehouse)
 */
router.put('/:id',
  authenticateToken,
  authorize('ADMIN', 'WAREHOUSE'),
  [
    param('id').isInt({ min: 1 }).withMessage('Valid product ID is required'),
    body('name_en').optional().notEmpty().withMessage('English name cannot be empty'),
    body('name_ar').optional().isString(),
    body('category').optional().isString(),
    body('origin').optional().isString(),
    body('unit').optional().isString(),
    body('min_qty').optional().isFloat({ min: 0 }),
    body('expiry_alert_days').optional().isInt({ min: 0 }),
    body('price_per_unit').optional().isFloat({ min: 0 })
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const product = await Product.findByPk(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      await product.update(req.body);

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: product
      });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update product',
        error: error.message
      });
    }
  }
);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id',
  authenticateToken,
  authorize('ADMIN'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const product = await Product.findByPk(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      await product.destroy();

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete product',
        error: error.message
      });
    }
  }
);

module.exports = router;
