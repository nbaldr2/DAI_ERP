const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const stockController = require('../controllers/stockController');
const { authenticateToken, authorize } = require('../middlewares/auth');

/**
 * @route   POST /api/sales
 * @desc    Create sale (transactional with locking)
 * @access  Private (Admin, Sales)
 */
router.post('/',
  authenticateToken,
  authorize('ADMIN', 'SALES'),
  [
    body('stock_entry_id').isInt({ min: 1 }).withMessage('Valid stock_entry_id is required'),
    body('customer_id').optional().isInt({ min: 1 }).withMessage('Valid customer_id required if provided'),
    body('sold_weight').isFloat({ min: 0.01 }).withMessage('Sold weight must be positive'),
    body('unit_price').optional().isFloat({ min: 0 }).withMessage('Unit price must be non-negative'),
    body('sale_date').isDate().withMessage('Valid sale_date is required (YYYY-MM-DD)'),
    body('notes').optional().isString()
  ],
  stockController.createSale
);

/**
 * @route   GET /api/sales
 * @desc    List all sales with filters
 * @access  Private
 */
router.get('/',
  authenticateToken,
  async (req, res) => {
    try {
      const { Sale, StockEntry, Product, Customer, Warehouse, Supplier, User } = require('../models');
      const { Op } = require('sequelize');
      const {
        stock_entry_id,
        customer_id,
        product_id,
        date_from,
        date_to,
        page = 1,
        limit = 50
      } = req.query;

      const where = {};
      if (stock_entry_id) where.stock_entry_id = stock_entry_id;
      if (customer_id) where.customer_id = customer_id;

      if (date_from || date_to) {
        where.sale_date = {};
        if (date_from) where.sale_date[Op.gte] = date_from;
        if (date_to) where.sale_date[Op.lte] = date_to;
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const include = [
        {
          model: StockEntry,
          as: 'stock_entry',
          include: [
            { model: Product, as: 'product' },
            { model: Warehouse, as: 'warehouse' },
            { model: Supplier, as: 'supplier' }
          ]
        },
        {
          model: Customer,
          as: 'customer',
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'name', 'role']
        }
      ];

      // Add product filter if needed
      if (product_id) {
        include[0].where = { product_id: parseInt(product_id) };
        include[0].required = true;
      }

      const { count, rows } = await Sale.findAndCountAll({
        where,
        include,
        order: [['sale_date', 'DESC'], ['created_at', 'DESC']],
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
      console.error('List sales error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list sales',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/sales/:id
 * @desc    Get sale by ID
 * @access  Private
 */
router.get('/:id',
  authenticateToken,
  [
    param('id').isInt({ min: 1 }).withMessage('Valid sale ID is required')
  ],
  async (req, res) => {
    try {
      const { Sale, StockEntry, Product, Customer, Warehouse, Supplier, User } = require('../models');
      const { id } = req.params;

      const sale = await Sale.findByPk(id, {
        include: [
          {
            model: StockEntry,
            as: 'stock_entry',
            include: [
              { model: Product, as: 'product' },
              { model: Warehouse, as: 'warehouse' },
              { model: Supplier, as: 'supplier' }
            ]
          },
          {
            model: Customer,
            as: 'customer'
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'name', 'role']
          }
        ]
      });

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: 'Sale not found'
        });
      }

      res.status(200).json({
        success: true,
        data: sale
      });
    } catch (error) {
      console.error('Get sale error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get sale',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/sales/summary/stats
 * @desc    Get sales statistics
 * @access  Private
 */
router.get('/summary/stats',
  authenticateToken,
  async (req, res) => {
    try {
      const { Sale, StockEntry, Product } = require('../models');
      const { Op } = require('sequelize');
      const { sequelize } = require('../config/database');
      const { date_from, date_to, product_id, customer_id } = req.query;

      const where = {};
      if (date_from || date_to) {
        where.sale_date = {};
        if (date_from) where.sale_date[Op.gte] = date_from;
        if (date_to) where.sale_date[Op.lte] = date_to;
      }
      if (customer_id) where.customer_id = customer_id;

      const include = [];
      if (product_id) {
        include.push({
          model: StockEntry,
          as: 'stock_entry',
          where: { product_id: parseInt(product_id) },
          required: true,
          attributes: []
        });
      }

      const stats = await Sale.findAll({
        where,
        include,
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('Sale.id')), 'total_sales'],
          [sequelize.fn('SUM', sequelize.col('sold_weight')), 'total_weight_sold'],
          [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_revenue'],
          [sequelize.fn('AVG', sequelize.col('unit_price')), 'avg_unit_price']
        ],
        raw: true
      });

      res.status(200).json({
        success: true,
        data: stats[0] || {
          total_sales: 0,
          total_weight_sold: 0,
          total_revenue: 0,
          avg_unit_price: 0
        }
      });
    } catch (error) {
      console.error('Get sales stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get sales statistics',
        error: error.message
      });
    }
  }
);

module.exports = router;
