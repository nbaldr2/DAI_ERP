const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const stockController = require('../controllers/stockController');

/**
 * @route   GET /api/reports/near-expiry
 * @desc    Get near-expiry stock items
 * @access  Private
 */
router.get('/near-expiry', authenticateToken, stockController.getNearExpiry);

/**
 * @route   GET /api/reports/stock-summary
 * @desc    Get comprehensive stock summary
 * @access  Private
 */
router.get('/stock-summary', authenticateToken, async (req, res) => {
  try {
    const { Sale, WasteDamage, StockEntry, InventoryLedger } = require('../models');
    const { sequelize } = require('../config/database');
    const { Op } = require('sequelize');

    // Get total stock weight
    const totalStock = await StockEntry.sum('total_weight', {
      where: { status: { [Op.in]: ['RECEIVED', 'INSPECTED'] } }
    }) || 0;

    // Get total waste
    const totalWaste = await WasteDamage.sum('waste_weight') || 0;

    // Get total sold
    const totalSold = await Sale.sum('sold_weight') || 0;

    // Get available stock from ledger
    const ledgerEntries = await InventoryLedger.findAll({
      attributes: [
        'stock_entry_id',
        [sequelize.fn('MAX', sequelize.col('id')), 'latest_id']
      ],
      group: ['stock_entry_id']
    });

    let totalAvailable = 0;
    for (const entry of ledgerEntries) {
      const latest = await InventoryLedger.findByPk(entry.dataValues.latest_id);
      if (latest && latest.balance_after > 0) {
        totalAvailable += parseFloat(latest.balance_after);
      }
    }

    res.json({
      success: true,
      data: {
        total_stock_kg: parseFloat(totalStock).toFixed(2),
        total_waste_kg: parseFloat(totalWaste).toFixed(2),
        total_sold_kg: parseFloat(totalSold).toFixed(2),
        total_available_kg: parseFloat(totalAvailable).toFixed(2),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Stock summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stock summary',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/reports/sales-revenue
 * @desc    Get sales revenue report
 * @access  Private
 */
router.get('/sales-revenue', authenticateToken, async (req, res) => {
  try {
    const { Sale, Customer, StockEntry, Product } = require('../models');
    const { sequelize } = require('../config/database');
    const { Op } = require('sequelize');
    const { date_from, date_to, customer_id, product_id } = req.query;

    const where = {};
    if (date_from || date_to) {
      where.sale_date = {};
      if (date_from) where.sale_date[Op.gte] = date_from;
      if (date_to) where.sale_date[Op.lte] = date_to;
    }
    if (customer_id) where.customer_id = customer_id;

    const include = [
      { model: Customer, as: 'customer', required: false }
    ];

    if (product_id) {
      include.push({
        model: StockEntry,
        as: 'stock_entry',
        where: { product_id: parseInt(product_id) },
        required: true,
        include: [{ model: Product, as: 'product' }]
      });
    } else {
      include.push({
        model: StockEntry,
        as: 'stock_entry',
        include: [{ model: Product, as: 'product' }]
      });
    }

    const sales = await Sale.findAll({
      where,
      include,
      order: [['sale_date', 'DESC']]
    });

    const summary = {
      total_sales: sales.length,
      total_revenue: 0,
      total_weight_sold: 0,
      by_customer: {},
      by_product: {},
      sales: sales.map(s => s.toJSON())
    };

    sales.forEach(sale => {
      summary.total_revenue += parseFloat(sale.total_amount || 0);
      summary.total_weight_sold += parseFloat(sale.sold_weight || 0);

      // Group by customer
      if (sale.customer) {
        const custKey = sale.customer_id;
        if (!summary.by_customer[custKey]) {
          summary.by_customer[custKey] = {
            customer_id: sale.customer_id,
            customer_name: sale.customer.name,
            total_revenue: 0,
            total_weight: 0,
            sales_count: 0
          };
        }
        summary.by_customer[custKey].total_revenue += parseFloat(sale.total_amount || 0);
        summary.by_customer[custKey].total_weight += parseFloat(sale.sold_weight || 0);
        summary.by_customer[custKey].sales_count++;
      }

      // Group by product
      if (sale.stock_entry && sale.stock_entry.product) {
        const prodKey = sale.stock_entry.product_id;
        if (!summary.by_product[prodKey]) {
          summary.by_product[prodKey] = {
            product_id: sale.stock_entry.product_id,
            product_name_en: sale.stock_entry.product.name_en,
            product_name_ar: sale.stock_entry.product.name_ar,
            total_revenue: 0,
            total_weight: 0,
            sales_count: 0
          };
        }
        summary.by_product[prodKey].total_revenue += parseFloat(sale.total_amount || 0);
        summary.by_product[prodKey].total_weight += parseFloat(sale.sold_weight || 0);
        summary.by_product[prodKey].sales_count++;
      }
    });

    summary.by_customer = Object.values(summary.by_customer);
    summary.by_product = Object.values(summary.by_product);

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Sales revenue report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sales revenue report',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/reports/waste-analysis
 * @desc    Get waste analysis report
 * @access  Private
 */
router.get('/waste-analysis', authenticateToken, async (req, res) => {
  try {
    const { WasteDamage, StockEntry, Product, Warehouse } = require('../models');
    const { Op } = require('sequelize');
    const { date_from, date_to, warehouse_id, product_id } = req.query;

    const where = {};
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at[Op.gte] = date_from;
      if (date_to) where.created_at[Op.lte] = date_to;
    }

    const include = [
      {
        model: StockEntry,
        as: 'stock_entry',
        include: [
          { model: Product, as: 'product' },
          { model: Warehouse, as: 'warehouse' }
        ]
      }
    ];

    if (warehouse_id) {
      include[0].where = { warehouse_id: parseInt(warehouse_id) };
      include[0].required = true;
    }

    if (product_id) {
      if (!include[0].where) include[0].where = {};
      include[0].where.product_id = parseInt(product_id);
      include[0].required = true;
    }

    const wasteRecords = await WasteDamage.findAll({
      where,
      include,
      order: [['created_at', 'DESC']]
    });

    const summary = {
      total_waste_records: wasteRecords.length,
      total_waste_weight: 0,
      by_product: {},
      by_warehouse: {},
      records: wasteRecords.map(w => w.toJSON())
    };

    wasteRecords.forEach(waste => {
      summary.total_waste_weight += parseFloat(waste.waste_weight || 0);

      // Group by product
      if (waste.stock_entry && waste.stock_entry.product) {
        const prodKey = waste.stock_entry.product_id;
        if (!summary.by_product[prodKey]) {
          summary.by_product[prodKey] = {
            product_id: waste.stock_entry.product_id,
            product_name_en: waste.stock_entry.product.name_en,
            product_name_ar: waste.stock_entry.product.name_ar,
            total_waste_weight: 0,
            waste_count: 0
          };
        }
        summary.by_product[prodKey].total_waste_weight += parseFloat(waste.waste_weight || 0);
        summary.by_product[prodKey].waste_count++;
      }

      // Group by warehouse
      if (waste.stock_entry && waste.stock_entry.warehouse) {
        const whKey = waste.stock_entry.warehouse_id;
        if (!summary.by_warehouse[whKey]) {
          summary.by_warehouse[whKey] = {
            warehouse_id: waste.stock_entry.warehouse_id,
            warehouse_name: waste.stock_entry.warehouse.name,
            total_waste_weight: 0,
            waste_count: 0
          };
        }
        summary.by_warehouse[whKey].total_waste_weight += parseFloat(waste.waste_weight || 0);
        summary.by_warehouse[whKey].waste_count++;
      }
    });

    summary.by_product = Object.values(summary.by_product);
    summary.by_warehouse = Object.values(summary.by_warehouse);

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Waste analysis report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get waste analysis report',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/reports/inventory-valuation
 * @desc    Get inventory valuation report
 * @access  Private
 */
router.get('/inventory-valuation', authenticateToken, async (req, res) => {
  try {
    const { ProductStock, Product, Warehouse } = require('../models');
    const { warehouse_id } = req.query;

    const where = {};
    if (warehouse_id) where.warehouse_id = parseInt(warehouse_id);

    const productStocks = await ProductStock.findAll({
      where,
      include: [
        { model: Product, as: 'product' },
        { model: Warehouse, as: 'warehouse' }
      ]
    });

    const valuation = {
      total_items: productStocks.length,
      total_value: 0,
      by_warehouse: {},
      items: []
    };

    for (const ps of productStocks) {
      const availableQty = parseFloat(ps.quantity_on_hand || 0);
      const unitPrice = parseFloat(ps.product?.price_per_unit || 0);
      const itemValue = availableQty * unitPrice;

      valuation.total_value += itemValue;

      valuation.items.push({
        product_id: ps.product_id,
        warehouse_id: ps.warehouse_id,
        product_name_en: ps.product?.name_en || 'Unknown',
        product_name_ar: ps.product?.name_ar || '',
        category: ps.product?.category || '-',
        warehouse_name: ps.warehouse?.name || 'Unknown',
        available_qty: availableQty,
        reserved_qty: parseFloat(ps.reserved_quantity || 0),
        unit_price: unitPrice,
        total_value: itemValue
      });

      // Group by warehouse
      const whKey = ps.warehouse_id;
      if (!valuation.by_warehouse[whKey]) {
        valuation.by_warehouse[whKey] = {
          warehouse_id: ps.warehouse_id,
          warehouse_name: ps.warehouse?.name || 'Unknown',
          total_value: 0,
          items_count: 0
        };
      }
      valuation.by_warehouse[whKey].total_value += itemValue;
      valuation.by_warehouse[whKey].items_count++;
    }

    valuation.items.sort((a, b) => b.total_value - a.total_value);
    valuation.by_warehouse = Object.values(valuation.by_warehouse)
      .sort((a, b) => b.total_value - a.total_value);

    res.json({ success: true, data: valuation });
  } catch (error) {
    console.error('Inventory valuation report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get inventory valuation report',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/reports/invoice-revenue
 * @desc    Get invoice revenue report
 * @access  Private
 */
router.get('/invoice-revenue', authenticateToken, async (req, res) => {
  try {
    const { Invoice, InvoiceItem, Customer, Product } = require('../models');
    const { sequelize } = require('../config/database');
    const { Op } = require('sequelize');
    const { date_from, date_to, customer_id, status } = req.query;

    // Build filters safely; invoices table does not have deleted_at
    const where = {};
    if (date_from || date_to) {
      where.invoice_date = {};
      if (date_from) where.invoice_date[Op.gte] = date_from;
      if (date_to) where.invoice_date[Op.lte] = date_to;
    }
    if (customer_id) where.customer_id = customer_id;
    if (status) where.status = String(status).toUpperCase();

    const invoices = await Invoice.findAll({
      where,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'contact', 'address']
        },
        {
          model: InvoiceItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name_en', 'name_ar', 'category']
            }
          ]
        }
      ],
      order: [['invoice_date', 'DESC']]
    });

    const summary = {
      total_invoices: invoices.length,
      total_revenue: 0,
      total_discount: 0,
      total_net: 0,
      by_status: {},
      by_customer: {},
      by_product: {},
      by_month: {},
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        customer_name: inv.customer?.name || 'N/A',
        invoice_date: inv.invoice_date,
        due_date: inv.due_date,
        status: inv.status,
        payment_mode: inv.payment_mode,
        subtotal: parseFloat(inv.subtotal || 0),
        total_discount: parseFloat(inv.total_discount || 0),
        total: parseFloat(inv.total || 0),
        items_count: inv.items?.length || 0
      }))
    };

    invoices.forEach(invoice => {
      const subtotal = parseFloat(invoice.subtotal || 0);
      const discount = parseFloat(invoice.total_discount || 0);
      const total = parseFloat(invoice.total || 0);

      summary.total_revenue += subtotal;
      summary.total_discount += discount;
      summary.total_net += total;

      // Group by status
      if (!summary.by_status[invoice.status]) {
        summary.by_status[invoice.status] = {
          count: 0,
          total_amount: 0
        };
      }
      summary.by_status[invoice.status].count++;
      summary.by_status[invoice.status].total_amount += total;

      // Group by customer
      if (invoice.customer) {
        const custKey = invoice.customer_id;
        if (!summary.by_customer[custKey]) {
          summary.by_customer[custKey] = {
            customer_id: invoice.customer_id,
            customer_name: invoice.customer.name,
            invoice_count: 0,
            total_amount: 0
          };
        }
        summary.by_customer[custKey].invoice_count++;
        summary.by_customer[custKey].total_amount += total;
      }

      // Group by month (handle Date objects and nulls safely)
      const invDate = invoice.invoice_date;
      if (invDate) {
        const monthKey = invDate instanceof Date
          ? invDate.toISOString().slice(0, 7) // YYYY-MM
          : String(invDate).slice(0, 7);
        if (!summary.by_month[monthKey]) {
          summary.by_month[monthKey] = {
            month: monthKey,
            invoice_count: 0,
            total_amount: 0
          };
        }
        summary.by_month[monthKey].invoice_count++;
        summary.by_month[monthKey].total_amount += total;
      }

      // Group by product
      if (invoice.items) {
        invoice.items.forEach(item => {
          if (item.product) {
            const prodKey = item.product_id;
            if (!summary.by_product[prodKey]) {
              summary.by_product[prodKey] = {
                product_id: item.product_id,
                product_name_en: item.product.name_en,
                product_name_ar: item.product.name_ar,
                category: item.product.category,
                total_quantity: 0,
                total_amount: 0,
                invoice_count: 0
              };
            }
            summary.by_product[prodKey].total_quantity += parseFloat(item.quantity || 0);
            summary.by_product[prodKey].total_amount += parseFloat(item.amount || 0);
            summary.by_product[prodKey].invoice_count++;
          }
        });
      }
    });

    // Convert objects to arrays and sort
    summary.by_customer = Object.values(summary.by_customer)
      .sort((a, b) => b.total_amount - a.total_amount);
    summary.by_product = Object.values(summary.by_product)
      .sort((a, b) => b.total_amount - a.total_amount);
    summary.by_month = Object.values(summary.by_month)
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Invoice revenue report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get invoice revenue report',
      error: error.message
    });
  }
});

module.exports = router;
