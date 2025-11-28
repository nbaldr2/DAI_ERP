const { sequelize } = require('../config/database');
const {
  StockEntry,
  InventoryLedger,
  WasteDamage,
  Sale,
  Product,
  Supplier,
  Warehouse,
  AuditLog
} = require('../models');
const { Op } = require('sequelize');

class StockService {
  /**
   * Create a new stock entry (receipt)
   * Implements transactional safety and automatic ledger entry
   */
  async createStockEntry(data, userId, ipAddress = null, userAgent = null) {
    const transaction = await sequelize.transaction();

    try {
      const {
        purchase_id,
        product_id,
        supplier_id,
        warehouse_id,
        pallets,
        pallet_weight,
        total_weight,
        received_weight,
        accepted_weight,
        date_in,
        expiry_date,
        status = 'PENDING',
        notes
      } = data;

      // Validate dates
      if (new Date(expiry_date) <= new Date(date_in)) {
        throw new Error('Expiry date must be after date_in');
      }

      // Calculate total_weight if not provided
      const calculatedWeight = total_weight || (pallets * pallet_weight);

      // Create stock entry
      const stockEntry = await StockEntry.create({
        purchase_id,
        product_id,
        supplier_id,
        warehouse_id,
        pallets: pallets || 0,
        pallet_weight,
        total_weight: calculatedWeight,
        received_weight,
        accepted_weight,
        date_in,
        expiry_date,
        status,
        notes,
        created_by: userId,
        version: 1
      }, { transaction });

      // Determine inbound quantity to ledger: prefer accepted_weight then received_weight then calculated total
      const inboundQty = parseFloat(
        (accepted_weight ?? received_weight ?? calculatedWeight)
      );

      // Create initial ledger entry (RECEIPT) with balance calculation
      await InventoryLedger.createEntry({
        stock_entry_id: stockEntry.id,
        movement_type: 'RECEIPT',
        qty: inboundQty,
        // Link to purchase if available, else the stock entry itself
        reference_type: purchase_id ? 'purchase' : 'stock_entry',
        reference_id: purchase_id || stockEntry.id,
        performed_by: userId,
        note: notes || 'Initial stock receipt'
      }, transaction);

      // Create audit log
      await AuditLog.logChange({
        entity_type: 'stock_entry',
        entity_id: stockEntry.id,
        action: 'CREATE',
        old_value: null,
        new_value: stockEntry.toJSON(),
        performed_by: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        notes: 'Stock entry created'
      }, transaction);

      await transaction.commit();

      // Reload with associations
      return await this.getStockEntryById(stockEntry.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update stock entry with optimistic locking
   */
  async updateStockEntry(id, data, userId, ipAddress = null, userAgent = null) {
    const transaction = await sequelize.transaction();

    try {
      const { version, ...updateData } = data;

      // Lock the stock entry
      const stockEntry = await StockEntry.findByPk(id, {
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      if (!stockEntry) {
        throw new Error('Stock entry not found');
      }

      // Check version for optimistic locking
      if (version !== undefined && stockEntry.version !== version) {
        throw new Error('Version mismatch - record has been modified by another user. Please refresh and try again.');
      }

      const oldValue = stockEntry.toJSON();

      // Update only allowed fields (prevent direct balance manipulation)
      const allowedFields = ['notes', 'expiry_date', 'status', 'pallets', 'pallet_weight'];
      const filteredData = {};

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      });

      // Recalculate total_weight if pallets or pallet_weight changed
      if (filteredData.pallets !== undefined || filteredData.pallet_weight !== undefined) {
        const newPallets = filteredData.pallets !== undefined ? filteredData.pallets : stockEntry.pallets;
        const newPalletWeight = filteredData.pallet_weight !== undefined ? filteredData.pallet_weight : stockEntry.pallet_weight;
        filteredData.total_weight = newPallets * newPalletWeight;
      }

      // Increment version
      filteredData.version = stockEntry.version + 1;

      await stockEntry.update(filteredData, { transaction });

      // Create audit log
      await AuditLog.logChange({
        entity_type: 'stock_entry',
        entity_id: stockEntry.id,
        action: 'UPDATE',
        old_value: oldValue,
        new_value: stockEntry.toJSON(),
        performed_by: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        notes: 'Stock entry updated'
      }, transaction);

      await transaction.commit();

      return await this.getStockEntryById(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Create waste/damage entry with transactional safety and row locking
   */
  async createWaste(data, userId, ipAddress = null, userAgent = null) {
    const transaction = await sequelize.transaction();

    try {
      const { stock_entry_id, waste_weight, reason, notes } = data;

      if (!stock_entry_id || !waste_weight || waste_weight <= 0) {
        throw new Error('Invalid waste data: stock_entry_id and positive waste_weight required');
      }

      // Lock the stock entry (SELECT FOR UPDATE)
      const stockEntry = await StockEntry.findByPk(stock_entry_id, {
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      if (!stockEntry) {
        throw new Error('Stock entry not found');
      }

      if (stockEntry.status === 'COMPLETED') {
        throw new Error('Cannot record waste for closed stock entry');
      }

      // Get current available balance
      const currentBalance = await InventoryLedger.getLatestBalance(stock_entry_id, transaction);

      if (waste_weight > currentBalance) {
        throw new Error(`Insufficient stock. Available: ${currentBalance}kg, Requested: ${waste_weight}kg`);
      }

      // Create waste record
      const wasteRecord = await WasteDamage.create({
        stock_entry_id,
        reason: reason || 'WASTE',
        waste_weight,
        notes,
        created_by: userId
      }, { transaction });

      // Create ledger entry
      const newBalance = currentBalance - waste_weight;
      await InventoryLedger.create({
        stock_entry_id,
        movement_type: 'WASTE',
        qty: -waste_weight,
        reference_type: 'waste_damage',
        reference_id: wasteRecord.id,
        balance_after: newBalance,
        performed_by: userId,
        note: notes || `Waste recorded (${reason || 'WASTE'})`
      }, { transaction });

      // If balance is zero, close the stock entry
      if (newBalance <= 0) {
        await stockEntry.update({ status: 'COMPLETED' }, { transaction });
      }

      // Create audit log
      await AuditLog.logChange({
        entity_type: 'waste_damage',
        entity_id: wasteRecord.id,
        action: 'CREATE',
        old_value: null,
        new_value: wasteRecord.toJSON(),
        performed_by: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        notes: 'Waste recorded'
      }, transaction);

      await transaction.commit();

      // Reload with associations
      return await WasteDamage.findByPk(wasteRecord.id, {
        include: [
          { model: StockEntry, as: 'stock_entry', include: [
            { model: Product, as: 'product' },
            { model: Warehouse, as: 'warehouse' }
          ]}
        ]
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Create sale with transactional safety and row locking
   */
  async createSale(data, userId, ipAddress = null, userAgent = null) {
    const transaction = await sequelize.transaction();

    try {
      const {
        stock_entry_id,
        customer_id,
        sold_weight,
        unit_price,
        sale_date,
        notes
      } = data;

      if (!stock_entry_id || !sold_weight || sold_weight <= 0) {
        throw new Error('Invalid sale data: stock_entry_id and positive sold_weight required');
      }

      // Lock the stock entry
      const stockEntry = await StockEntry.findByPk(stock_entry_id, {
        lock: transaction.LOCK.UPDATE,
        transaction,
        include: [{ model: Product, as: 'product' }]
      });

      if (!stockEntry) {
        throw new Error('Stock entry not found');
      }

      if (stockEntry.status === 'COMPLETED') {
        throw new Error('Cannot sell from closed stock entry');
      }
      if (stockEntry.status === 'PENDING') {
        throw new Error('Cannot sell from quarantined stock');
      }

      // Get current available balance
      const currentBalance = await InventoryLedger.getLatestBalance(stock_entry_id, transaction);

      if (sold_weight > currentBalance) {
        throw new Error(`Insufficient stock. Available: ${currentBalance}kg, Requested: ${sold_weight}kg`);
      }

      // Determine unit price
      const finalUnitPrice = unit_price || stockEntry.product.price_per_unit || 0;
      const totalAmount = sold_weight * finalUnitPrice;

      // Create sale record
      const saleRecord = await Sale.create({
        stock_entry_id,
        customer_id,
        sold_weight,
        unit_price: finalUnitPrice,
        total_amount: totalAmount,
        sale_date: sale_date || new Date(),
        notes,
        created_by: userId
      }, { transaction });

      // Create ledger entry
      const newBalance = currentBalance - sold_weight;
      await InventoryLedger.create({
        stock_entry_id,
        movement_type: 'SALE',
        qty: -sold_weight,
        reference_type: 'sales',
        reference_id: saleRecord.id,
        balance_after: newBalance,
        performed_by: userId,
        note: notes || `Sale recorded - ${sold_weight}kg`
      }, { transaction });

      // If balance is zero or very close to zero, close the stock entry
      if (newBalance <= 0.01) {
        await stockEntry.update({ status: 'COMPLETED' }, { transaction });
      }

      // Create audit log
      await AuditLog.logChange({
        entity_type: 'sales',
        entity_id: saleRecord.id,
        action: 'CREATE',
        old_value: null,
        new_value: saleRecord.toJSON(),
        performed_by: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        notes: 'Sale recorded'
      }, transaction);

      await transaction.commit();

      // Reload with associations
      return await Sale.findByPk(saleRecord.id, {
        include: [
          {
            model: StockEntry,
            as: 'stock_entry',
            include: [
              { model: Product, as: 'product' },
              { model: Warehouse, as: 'warehouse' },
              { model: Supplier, as: 'supplier' }
            ]
          }
        ]
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get stock entry by ID with all associations
   */
  async getStockEntryById(id) {
    const stockEntry = await StockEntry.findByPk(id, {
      include: [
        { model: Product, as: 'product' },
        { model: Supplier, as: 'supplier' },
        { model: Warehouse, as: 'warehouse' },
        {
          model: InventoryLedger,
          as: 'ledger_entries',
          order: [['id', 'DESC']],
          limit: 10
        }
      ]
    });

    if (!stockEntry) {
      throw new Error('Stock entry not found');
    }

    // Get current balance
    const currentBalance = await InventoryLedger.getLatestBalance(id);

    return {
      ...stockEntry.toJSON(),
      available_qty: currentBalance
    };
  }

  /**
   * List stock entries with filters and pagination
   */
  async listStockEntries(filters = {}, pagination = {}) {
    const {
      product_id,
      supplier_id,
      warehouse_id,
      status,
      near_expiry_days,
      search
    } = filters;

    const { page = 1, limit = 50 } = pagination;
    const offset = (page - 1) * limit;

    const where = {};

    if (product_id) where.product_id = product_id;
    if (supplier_id) where.supplier_id = supplier_id;
    if (warehouse_id) where.warehouse_id = warehouse_id;
    if (status) {
      if (Array.isArray(status)) {
        where.status = { [Op.in]: status };
      } else {
        where.status = status;
      }
    }

    // Near expiry filter
    if (near_expiry_days) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parseInt(near_expiry_days));
      where.expiry_date = {
        [Op.lte]: futureDate,
        [Op.gte]: new Date()
      };
    }

    const include = [
      { model: Product, as: 'product' },
      { model: Supplier, as: 'supplier' },
      { model: Warehouse, as: 'warehouse' }
    ];

    // Search in notes or product name
    if (search) {
      where[Op.or] = [
        { notes: { [Op.like]: `%${search}%` } },
        { '$product.name_en$': { [Op.like]: `%${search}%` } },
        { '$product.name_ar$': { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await StockEntry.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [['date_in', 'DESC'], ['id', 'DESC']],
      distinct: true
    });

    // Attach available quantities
    const stocksWithBalance = await Promise.all(
      rows.map(async (stock) => {
        const balance = await InventoryLedger.getLatestBalance(stock.id);
        return {
          ...stock.toJSON(),
          available_qty: balance
        };
      })
    );

    return {
      data: stocksWithBalance,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Get stock summary by product
   */
  async getStockSummary(filters = {}) {
    const { product_id, warehouse_id } = filters;

    const where = {
      status: { [Op.in]: ['RECEIVED', 'INSPECTED'] }
    };

    if (product_id) where.product_id = product_id;
    if (warehouse_id) where.warehouse_id = warehouse_id;

    const stocks = await StockEntry.findAll({
      where,
      include: [
        { model: Product, as: 'product' },
        { model: Warehouse, as: 'warehouse' }
      ]
    });

    // Calculate totals
    const summary = {
      total_batches: stocks.length,
      total_initial_weight: 0,
      total_available_weight: 0,
      by_product: {},
      by_warehouse: {}
    };

    for (const stock of stocks) {
      const balance = await InventoryLedger.getLatestBalance(stock.id);

      summary.total_initial_weight += parseFloat(stock.total_weight);
      summary.total_available_weight += balance;

      // Group by product
      const productKey = stock.product_id;
      if (!summary.by_product[productKey]) {
        summary.by_product[productKey] = {
          product_id: stock.product_id,
          product_name_en: stock.product.name_en,
          product_name_ar: stock.product.name_ar,
          batches: 0,
          total_weight: 0,
          available_weight: 0
        };
      }
      summary.by_product[productKey].batches++;
      summary.by_product[productKey].total_weight += parseFloat(stock.total_weight);
      summary.by_product[productKey].available_weight += balance;

      // Group by warehouse
      const warehouseKey = stock.warehouse_id;
      if (!summary.by_warehouse[warehouseKey]) {
        summary.by_warehouse[warehouseKey] = {
          warehouse_id: stock.warehouse_id,
          warehouse_name: stock.warehouse.name,
          batches: 0,
          total_weight: 0,
          available_weight: 0
        };
      }
      summary.by_warehouse[warehouseKey].batches++;
      summary.by_warehouse[warehouseKey].total_weight += parseFloat(stock.total_weight);
      summary.by_warehouse[warehouseKey].available_weight += balance;
    }

    // Convert objects to arrays
    summary.by_product = Object.values(summary.by_product);
    summary.by_warehouse = Object.values(summary.by_warehouse);

    return summary;
  }

  /**
   * Get near-expiry stock items
   */
  async getNearExpiryItems(days = 7, warehouseId = null) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));

    const where = {
      status: { [Op.in]: ['RECEIVED', 'INSPECTED'] },
      expiry_date: {
        [Op.lte]: futureDate,
        [Op.gte]: new Date()
      }
    };

    if (warehouseId) {
      where.warehouse_id = warehouseId;
    }

    const stocks = await StockEntry.findAll({
      where,
      include: [
        { model: Product, as: 'product' },
        { model: Supplier, as: 'supplier' },
        { model: Warehouse, as: 'warehouse' }
      ],
      order: [['expiry_date', 'ASC']]
    });

    // Attach balances and calculate days until expiry
    const stocksWithDetails = await Promise.all(
      stocks.map(async (stock) => {
        const balance = await InventoryLedger.getLatestBalance(stock.id);
        const expiryDate = new Date(stock.expiry_date);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

        return {
          ...stock.toJSON(),
          available_qty: balance,
          days_until_expiry: daysUntilExpiry
        };
      })
    );

    return stocksWithDetails.filter(s => s.available_qty > 0);
  }

  /**
   * Get balance per product and warehouse
   */
  async getBalanceByProductWarehouse(productId, warehouseId) {
    if (!productId || !warehouseId) {
      throw new Error('product_id and warehouse_id are required');
    }

    const stocks = await StockEntry.findAll({
      where: {
        product_id: productId,
        warehouse_id: warehouseId,
        status: { [Op.in]: ['RECEIVED', 'INSPECTED'] }
      }
    });

    let totalAvailable = 0;
    for (const stock of stocks) {
      const balance = await InventoryLedger.getLatestBalance(stock.id);
      totalAvailable += balance;
    }

    return {
      product_id: productId,
      warehouse_id: warehouseId,
      available_weight: parseFloat(totalAvailable.toFixed(2)),
      batches: stocks.length
    };
  }

  /**
   * Get stock trends by product over time
   */
  async getStockTrends(days = 30) {
    try {
      const { sequelize } = require('../config/database');
      const { InventoryLedger, StockEntry, Product } = require('../models');
      const { Op } = require('sequelize');

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      // Get ledger entries grouped by product and date
      const ledgerEntries = await InventoryLedger.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('performed_at')), 'date'],
          [sequelize.col('stock_entry.product.name_en'), 'product_name'],
          [sequelize.fn('SUM', sequelize.col('qty')), 'quantity_change'],
          [sequelize.fn('MAX', sequelize.col('balance_after')), 'balance']
        ],
        include: [
          {
            model: StockEntry,
            as: 'stock_entry',
            attributes: [],
            include: [
              {
                model: Product,
                as: 'product',
                attributes: []
              }
            ]
          }
        ],
        where: {
          performed_at: {
            [Op.between]: [startDate, endDate]
          }
        },
        group: [
          sequelize.fn('DATE', sequelize.col('performed_at')),
          sequelize.col('stock_entry.product.name_en')
        ],
        order: [
          [sequelize.fn('DATE', sequelize.col('performed_at')), 'ASC'],
          [sequelize.col('stock_entry.product.name_en'), 'ASC']
        ]
      });

      // Process data for chart
      const trends = {};
      ledgerEntries.forEach(entry => {
        const date = entry.dataValues.date;
        const productName = entry.dataValues.product_name;
        const balance = parseFloat(entry.dataValues.balance);

        if (!trends[productName]) {
          trends[productName] = [];
        }

        trends[productName].push({
          date: date,
          balance: balance
        });
      });

      return trends;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Soft delete stock entry
   */
  async deleteStockEntry(id, userId, ipAddress = null, userAgent = null) {
    const transaction = await sequelize.transaction();

    try {
      const stockEntry = await StockEntry.findByPk(id, { transaction });

      if (!stockEntry) {
        throw new Error('Stock entry not found');
      }

      // Check if there are any sales or waste recorded
      const balance = await InventoryLedger.getLatestBalance(id, transaction);
      const hasMovements = balance < parseFloat(stockEntry.total_weight);

      if (hasMovements) {
        throw new Error('Cannot delete stock entry with recorded movements (sales/waste)');
      }

      const oldValue = stockEntry.toJSON();

      // Soft delete
      await stockEntry.destroy({ transaction });

      // Create audit log
      await AuditLog.logChange({
        entity_type: 'stock_entry',
        entity_id: id,
        action: 'DELETE',
        old_value: oldValue,
        new_value: null,
        performed_by: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        notes: 'Stock entry soft deleted'
      }, transaction);

      await transaction.commit();

      return { success: true, message: 'Stock entry deleted successfully' };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete waste entry and reverse stock movement
   */
  async deleteWaste(id, userId, ipAddress = null, userAgent = null) {
    const transaction = await sequelize.transaction();

    try {
      const wasteRecord = await WasteDamage.findByPk(id, { transaction });

      if (!wasteRecord) {
        throw new Error('Waste record not found');
      }

      const stockEntry = await StockEntry.findByPk(wasteRecord.stock_entry_id, {
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      if (!stockEntry) {
        throw new Error('Associated stock entry not found');
      }

      const currentBalance = await InventoryLedger.getLatestBalance(stockEntry.id, transaction);
      const newBalance = currentBalance + wasteRecord.waste_weight;

      // Create reversal ledger entry
      await InventoryLedger.create({
        stock_entry_id: stockEntry.id,
        movement_type: 'WASTE_REVERSAL',
        qty: wasteRecord.waste_weight,
        reference_type: 'waste_damage',
        reference_id: id,
        balance_after: newBalance,
        performed_by: userId,
        note: `Reversal for waste record #${id}`
      }, { transaction });

      // If stock entry was closed, reopen it
      if (stockEntry.status === 'COMPLETED') {
        await stockEntry.update({ status: 'RECEIVED' }, { transaction });
      }

      const oldValue = wasteRecord.toJSON();

      // Delete the waste record
      await wasteRecord.destroy({ transaction });

      // Create audit log
      await AuditLog.logChange({
        entity_type: 'waste_damage',
        entity_id: id,
        action: 'DELETE',
        old_value: oldValue,
        new_value: null,
        performed_by: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        notes: 'Waste record deleted and stock reversed'
      }, transaction);

      await transaction.commit();

      return { success: true, message: 'Waste record deleted successfully' };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new StockService();
