const Purchase = require('../models/Purchase');
const PurchaseItem = require('../models/PurchaseItem');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { sequelize, Sequelize } = require('../config/database');
const stockService = require('../services/stockService');
const { validationResult } = require('express-validator');
const { generatePONumber } = require('../utils/generators');
const { Op } = Sequelize;

// List purchases with pagination and filtering
exports.listPurchases = async (req, res) => {
  try {
    const {
      supplier_id,
      status,
      date_from,
      date_to,
      page = 1,
      limit = 10
    } = req.query;

    const where = {};
    if (supplier_id) where.supplier_id = supplier_id;
    if (status) where.status = status;

    if (date_from || date_to) {
      where.order_date = {};
      if (date_from) where.order_date[Op.gte] = date_from;
      if (date_to) where.order_date[Op.lte] = date_to;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const include = [
      {
        model: Supplier,
        as: 'supplier'
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'name', 'role']
      },
      {
        model: PurchaseItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product'
        }]
      }
    ];

    const { count, rows } = await Purchase.findAndCountAll({
      where,
      include,
      order: [['order_date', 'DESC'], ['created_at', 'DESC']],
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
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error listing purchases:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list purchases',
      error: error.message
    });
  }
};

// Get purchase by ID
exports.getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;

    const purchase = await Purchase.findByPk(id, {
      include: [
        {
          model: Supplier,
          as: 'supplier'
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'name', 'role']
        },
        {
          model: PurchaseItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product'
          }]
        }
      ]
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    res.status(200).json({
      success: true,
      data: purchase
    });
  } catch (error) {
    console.error('Error getting purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get purchase',
      error: error.message
    });
  }
};

// Create a new purchase
exports.createPurchase = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const {
      supplier_id,
      order_date,
      expected_date,
      notes,
      status = 'DRAFT',
      items
    } = req.body;

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'At least one item is required'
      });
    }

    // Generate PO number
    const po_number = await generatePONumber();

    // Calculate total
    const total = items.reduce((sum, item) => sum + (parseFloat(item.qty) * parseFloat(item.unit_price)), 0);

    // Create purchase
    const purchase = await Purchase.create({
      supplier_id,
      po_number,
      order_date,
      expected_date,
      status,
      total,
      notes,
      created_by: req.user.id
    }, { transaction });

    // Create purchase items
    const purchaseItems = [];
    for (const item of items) {
      const { product_id, qty, unit_price, warehouse_id } = item;
      const total_price = parseFloat(qty) * parseFloat(unit_price);

      const purchaseItem = await PurchaseItem.create({
        purchase_id: purchase.id,
        product_id,
        quantity: qty,
        unit_price,
        total_price,
        warehouse_id // Add warehouse_id to the purchase item
      }, { transaction });

      purchaseItems.push(purchaseItem);
    }

    // Create audit log entry
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    
    await AuditLog.logChange({
      entity_type: 'purchase',
      entity_id: purchase.id,
      action: 'CREATE',
      old_value: null,
      new_value: {
        ...purchase.toJSON(),
        items: purchaseItems.map(item => item.toJSON())
      },
      performed_by: req.user.id,
      ip_address: ipAddress,
      user_agent: userAgent,
      notes: 'Purchase order created'
    }, transaction);

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      data: {
        purchase,
        items: purchaseItems
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create purchase order',
      error: error.message
    });
  }
};

// Update purchase status
exports.updatePurchaseStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const purchase = await Purchase.findByPk(id, { transaction });

    if (!purchase) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    // Update purchase
    purchase.status = status;
    if (notes) purchase.notes = notes;
    await purchase.save({ transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Purchase status updated successfully',
      data: purchase
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating purchase status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update purchase status',
      error: error.message
    });
  }
};

// Receive purchase: create stock entries per items and log ledger
exports.receivePurchase = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { receipts = [], date_in, default_expiry_date } = req.body;

    const purchase = await Purchase.findByPk(id, {
      include: [
        { model: Supplier, as: 'supplier' },
        { model: PurchaseItem, as: 'items' }
      ],
      transaction
    });

    if (!purchase) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    // Only allow receiving for non-cancelled purchases
    if (purchase.status === 'CANCELLED' || purchase.status === 'CLOSED') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Purchase cannot be received in current status' });
    }

    // Map items by id for quick lookup
    const itemsById = new Map(purchase.items.map(i => [i.id, i]));

    const createdStocks = [];

    for (const receipt of receipts) {
      const { purchase_item_id, accepted_weight, pallets = 0, pallet_weight = 0, warehouse_id, expiry_date, notes } = receipt;
      const item = itemsById.get(purchase_item_id);

      if (!item) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: `Invalid purchase_item_id: ${purchase_item_id}` });
      }

      const effectiveWarehouseId = warehouse_id || item.warehouse_id;
      if (!effectiveWarehouseId) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'warehouse_id is required on receipt or purchase item' });
      }

      const effectiveExpiry = expiry_date || default_expiry_date;
      if (!date_in || !effectiveExpiry) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'date_in and expiry_date are required' });
      }

      // Create stock entry via service (will create ledger entry)
      const stockData = {
        purchase_id: purchase.id,
        product_id: item.product_id,
        supplier_id: purchase.supplier_id,
        warehouse_id: effectiveWarehouseId,
        pallets,
        pallet_weight,
        total_weight: pallets && pallet_weight ? (parseFloat(pallets) * parseFloat(pallet_weight)) : accepted_weight,
        received_weight: accepted_weight,
        accepted_weight,
        date_in,
        expiry_date: effectiveExpiry,
        status: 'RECEIVED',
        notes
      };

      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      const stockEntry = await stockService.createStockEntry(stockData, req.user.id, ipAddress, userAgent);
      createdStocks.push(stockEntry);
    }

    // Mark purchase as RECEIVED if not already
    purchase.status = 'RECEIVED';
    await purchase.save({ transaction });

    // Audit log
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    await AuditLog.logChange({
      entity_type: 'purchase',
      entity_id: purchase.id,
      action: 'UPDATE',
      old_value: null,
      new_value: { status: purchase.status, received_count: createdStocks.length },
      performed_by: req.user.id,
      ip_address: ipAddress,
      user_agent: userAgent,
      notes: 'Purchase received and stock entries created'
    }, transaction);

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: 'Purchase received successfully',
      data: {
        purchase: purchase.toJSON(),
        stock_entries: createdStocks
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error receiving purchase:', error);
    return res.status(500).json({ success: false, message: 'Failed to receive purchase', error: error.message });
  }
};

// Update purchase (full update)
exports.updatePurchase = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const {
      supplier_id,
      order_date,
      expected_date,
      notes,
      status,
      items
    } = req.body;

    const purchase = await Purchase.findByPk(id, { transaction });

    if (!purchase) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    // Only allow updating DRAFT purchases
    if (purchase.status !== 'DRAFT') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Only purchases in DRAFT status can be updated'
      });
    }

    // Get old value for audit log
    const oldValue = {
      ...purchase.toJSON(),
      items: await PurchaseItem.findAll({
        where: { purchase_id: id },
        transaction
      })
    };

    // Update purchase details
    purchase.supplier_id = supplier_id;
    purchase.order_date = order_date;
    purchase.expected_date = expected_date || null;
    purchase.notes = notes || null;
    purchase.status = status;

    // Calculate total
    const total = items.reduce((sum, item) => sum + (parseFloat(item.qty) * parseFloat(item.unit_price)), 0);
    purchase.total = total;

    await purchase.save({ transaction });

    // Delete existing purchase items
    await PurchaseItem.destroy({
      where: { purchase_id: id },
      transaction
    });

    // Create new purchase items
    const purchaseItems = [];
    for (const item of items) {
      const { product_id, qty, unit_price, warehouse_id } = item;
      const total_price = parseFloat(qty) * parseFloat(unit_price);

      const purchaseItem = await PurchaseItem.create({
        purchase_id: purchase.id,
        product_id,
        quantity: qty,
        unit_price,
        total_price,
        warehouse_id
      }, { transaction });

      purchaseItems.push(purchaseItem);
    }

    // Create audit log entry
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    const newValue = {
      ...purchase.toJSON(),
      items: purchaseItems
    };
    
    await AuditLog.logChange({
      entity_type: 'purchase',
      entity_id: purchase.id,
      action: 'UPDATE',
      old_value: oldValue,
      new_value: newValue,
      performed_by: req.user.id,
      ip_address: ipAddress,
      user_agent: userAgent,
      notes: 'Purchase order updated'
    }, transaction);

    await transaction.commit();

    // Fetch updated purchase with items
    const updatedPurchase = await Purchase.findByPk(id, {
      include: [
        {
          model: Supplier,
          as: 'supplier'
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'name', 'role']
        },
        {
          model: PurchaseItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product'
          }]
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Purchase updated successfully',
      data: updatedPurchase
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update purchase',
      error: error.message
    });
  }
};

// Delete purchase (only if in DRAFT status)
exports.deletePurchase = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const purchase = await Purchase.findByPk(id, { transaction });

    if (!purchase) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    // Only allow deletion of DRAFT purchases
    if (purchase.status !== 'DRAFT') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Only purchases in DRAFT status can be deleted'
      });
    }

    // Delete purchase items first
    await PurchaseItem.destroy({
      where: { purchase_id: id },
      transaction
    });

    // Delete purchase
    await purchase.destroy({ transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Purchase deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete purchase',
      error: error.message
    });
  }
};
