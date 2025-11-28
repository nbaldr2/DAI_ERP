const stockService = require('../services/stockService');
const { validationResult } = require('express-validator');

class StockController {
  /**
   * Create new stock entry (receipt)
   * POST /api/stock
   */
  async createStock(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.userId;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      const stockEntry = await stockService.createStockEntry(
        req.body,
        userId,
        ipAddress,
        userAgent
      );

      return res.status(201).json({
        success: true,
        message: 'Stock entry created successfully',
        data: stockEntry
      });
    } catch (error) {
      console.error('Create stock error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create stock entry',
        error: error.message
      });
    }
  }

  /**
   * Get stock entry by ID
   * GET /api/stock/:id
   */
  async getStockById(req, res) {
    try {
      const { id } = req.params;

      const stockEntry = await stockService.getStockEntryById(id);

      return res.status(200).json({
        success: true,
        data: stockEntry
      });
    } catch (error) {
      console.error('Get stock error:', error);

      if (error.message === 'Stock entry not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to get stock entry',
        error: error.message
      });
    }
  }

  /**
   * List stock entries with filters
   * GET /api/stock
   */
  async listStock(req, res) {
    try {
      const {
        product_id,
        supplier_id,
        warehouse_id,
        status,
        near_expiry_days,
        search,
        page,
        limit
      } = req.query;

      const filters = {
        product_id,
        supplier_id,
        warehouse_id,
        status,
        near_expiry_days,
        search
      };

      const pagination = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50
      };

      const result = await stockService.listStockEntries(filters, pagination);

      return res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('List stock error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to list stock entries',
        error: error.message
      });
    }
  }

  /**
   * Update stock entry (with optimistic locking)
   * PUT /api/stock/:id
   */
  async updateStock(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const userId = req.userId;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      const stockEntry = await stockService.updateStockEntry(
        id,
        req.body,
        userId,
        ipAddress,
        userAgent
      );

      return res.status(200).json({
        success: true,
        message: 'Stock entry updated successfully',
        data: stockEntry
      });
    } catch (error) {
      console.error('Update stock error:', error);

      if (error.message.includes('Version mismatch')) {
        return res.status(409).json({
          success: false,
          message: error.message,
          code: 'VERSION_MISMATCH'
        });
      }

      if (error.message === 'Stock entry not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to update stock entry',
        error: error.message
      });
    }
  }

  /**
   * Delete stock entry (soft delete)
   * DELETE /api/stock/:id
   */
  async deleteStock(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      const result = await stockService.deleteStockEntry(
        id,
        userId,
        ipAddress,
        userAgent
      );

      return res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Delete stock error:', error);

      if (error.message === 'Stock entry not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Cannot delete')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to delete stock entry',
        error: error.message
      });
    }
  }

  /**
   * Create waste/damage entry
   * POST /api/waste
   */
  async createWaste(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.userId;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      const wasteRecord = await stockService.createWaste(
        req.body,
        userId,
        ipAddress,
        userAgent
      );

      return res.status(201).json({
        success: true,
        message: 'Waste recorded successfully',
        data: wasteRecord
      });
    } catch (error) {
      console.error('Create waste error:', error);

      if (error.message.includes('Insufficient stock')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Stock entry not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to record waste',
        error: error.message
      });
    }
  }

  /**
   * Create sale
   * POST /api/sales
   */
  async createSale(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.userId;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      const saleRecord = await stockService.createSale(
        req.body,
        userId,
        ipAddress,
        userAgent
      );

      return res.status(201).json({
        success: true,
        message: 'Sale recorded successfully',
        data: saleRecord
      });
    } catch (error) {
      console.error('Create sale error:', error);

      if (error.message.includes('Insufficient stock')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Stock entry not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Cannot sell')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to record sale',
        error: error.message
      });
    }
  }

  /**
   * Delete waste entry
   * DELETE /api/waste/:id
   */
  async deleteWaste(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      const result = await stockService.deleteWaste(
        id,
        userId,
        ipAddress,
        userAgent
      );

      return res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Delete waste error:', error);

      if (error.message === 'Waste record not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to delete waste record',
        error: error.message
      });
    }
  }

  /**
   * Get stock summary
   * GET /api/stock/summary
   */
  async getStockSummary(req, res) {
    try {
      const { product_id, warehouse_id } = req.query;

      const filters = {
        product_id,
        warehouse_id
      };

      const summary = await stockService.getStockSummary(filters);

      return res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Get stock summary error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get stock summary',
        error: error.message
      });
    }
  }

  /**
   * Get stock balance per product per warehouse
   * GET /api/stock/balance?product_id=&warehouse_id=
   */
  async getBalance(req, res) {
    try {
      const { product_id, warehouse_id } = req.query;
      if (!product_id || !warehouse_id) {
        return res.status(400).json({ success: false, message: 'product_id and warehouse_id are required' });
      }

      const result = await stockService.getBalanceByProductWarehouse(parseInt(product_id, 10), parseInt(warehouse_id, 10));
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('Get balance error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get stock balance', error: error.message });
    }
  }

  /**
   * Get near-expiry items
   * GET /api/reports/near-expiry
   */
  async getNearExpiry(req, res) {
    try {
      const { days = 7, warehouse_id } = req.query;

      const items = await stockService.getNearExpiryItems(days, warehouse_id);

      return res.status(200).json({
        success: true,
        data: items,
        meta: {
          days: parseInt(days),
          count: items.length
        }
      });
    } catch (error) {
      console.error('Get near-expiry error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get near-expiry items',
        error: error.message
      });
    }
  }

  /**
   * Get stock trends by product over time
   * GET /api/stock/trends
   */
  async getStockTrends(req, res) {
    try {
      const { days = 30 } = req.query;
      
      const result = await stockService.getStockTrends(days);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get stock trends error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get stock trends',
        error: error.message
      });
    }
  }

  /**
   * Get ledger entries for a stock entry
   * GET /api/ledger/:stock_entry_id
   */
  async getLedger(req, res) {
    try {
      const { stock_entry_id } = req.params;
      const { InventoryLedger } = require('../models');

      const ledgerEntries = await InventoryLedger.findAll({
        where: { stock_entry_id },
        include: [
          {
            model: require('../models').User,
            as: 'performer',
            attributes: ['id', 'username', 'name', 'role']
          }
        ],
        order: [['id', 'DESC']]
      });

      return res.status(200).json({
        success: true,
        data: ledgerEntries
      });
    } catch (error) {
      console.error('Get ledger error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get ledger entries',
        error: error.message
      });
    }
  }

  /**
   * List inventory ledger entries globally with optional filters
   * GET /api/ledger
   */
  async listLedger(req, res) {
    try {
      const { InventoryLedger, StockEntry, Product, Warehouse, Supplier, User } = require('../models');
      const { Op } = require('sequelize');

      const {
        stock_entry_id,
        product_id,
        movement_type,
        search,
        date_range,
        start_date,
        end_date,
        page = 1,
        limit = 200,
      } = req.query;

      const where = {};

      if (stock_entry_id) where.stock_entry_id = parseInt(stock_entry_id, 10);

      if (movement_type) {
        if (Array.isArray(movement_type)) {
          where.movement_type = { [Op.in]: movement_type.map((t) => String(t).toUpperCase()) };
        } else {
          where.movement_type = String(movement_type).toUpperCase();
        }
      }

      // Date filtering
      let dateFrom = null;
      let dateTo = null;
      const now = new Date();

      if (date_range && date_range !== 'all') {
        const start = new Date();
        switch (date_range) {
          case 'today':
            dateFrom = new Date();
            dateFrom.setHours(0, 0, 0, 0);
            dateTo = new Date();
            dateTo.setHours(23, 59, 59, 999);
            break;
          case 'week':
            dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateTo = now;
            break;
          case 'month':
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            dateFrom = start;
            dateTo = now;
            break;
          case '90':
          case 'quarter':
            dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            dateTo = now;
            break;
          default:
            break;
        }
      }

      if (start_date) {
        const parsed = new Date(start_date);
        if (!isNaN(parsed)) {
          dateFrom = parsed;
        }
      }

      if (end_date) {
        const parsedEnd = new Date(end_date);
        if (!isNaN(parsedEnd)) {
          parsedEnd.setHours(23, 59, 59, 999);
          dateTo = parsedEnd;
        }
      }

      if (dateFrom || dateTo) {
        where.performed_at = {};
        if (dateFrom) where.performed_at[Op.gte] = dateFrom;
        if (dateTo) where.performed_at[Op.lte] = dateTo;
      }

      const include = [
        {
          model: StockEntry,
          as: 'stock_entry',
          include: [
            { model: Product, as: 'product' },
            { model: Warehouse, as: 'warehouse' },
            { model: Supplier, as: 'supplier' },
          ],
        },
        { model: User, as: 'performer', attributes: ['id', 'username', 'name', 'role'] },
      ];

      if (product_id) {
        include[0].where = { product_id: parseInt(product_id, 10) };
        include[0].required = true;
      }

      const queryOptions = {
        where,
        include,
        order: [['performed_at', 'DESC'], ['id', 'DESC']],
        limit: parseInt(limit, 10) || 200,
        offset: ((parseInt(page, 10) || 1) - 1) * (parseInt(limit, 10) || 200),
      };

      if (search && String(search).trim().length > 0) {
        queryOptions.where[Op.or] = [
          { note: { [Op.like]: `%${search}%` } },
          { '$stock_entry.product.name_en$': { [Op.like]: `%${search}%` } },
          { '$stock_entry.product.name_ar$': { [Op.like]: `%${search}%` } },
        ];
      }

      const { count, rows } = await InventoryLedger.findAndCountAll(queryOptions);

      return res.status(200).json({
        success: true,
        data: rows,
        pagination: { total: count, page: parseInt(page, 10) || 1, limit: parseInt(limit, 10) || 200 },
      });
    } catch (error) {
      console.error('List ledger error:', error);
      return res.status(500).json({ success: false, message: 'Failed to list inventory ledger', error: error.message });
    }
  }
}

module.exports = new StockController();
