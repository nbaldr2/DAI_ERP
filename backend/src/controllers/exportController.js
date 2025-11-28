const { sequelize } = require('../config/database');
const { 
  Invoice, InvoiceItem, Purchase, PurchaseItem, Product, 
  Customer, Supplier, StockEntry, Warehouse, WasteDamage,
  User, AuditLog, InventoryLedger, Attachment, Sale
} = require('../models');
const { Op } = require('sequelize');

/**
 * Convert data to CSV format
 * @param {Array} data - Array of objects to convert to CSV
 * @returns {string} - CSV formatted string
 */
const convertToCSV = (data) => {
  if (!data || data.length === 0) return '';
  
  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // Create CSV header row
  const csvHeader = headers.join(',');
  
  // Create CSV data rows
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Escape commas and wrap in quotes if needed
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });
  
  return [csvHeader, ...csvRows].join('\n');
};

/**
 * Export any table to CSV
 * @route GET /api/export/:tableName
 * @access Private (Admin only)
 */
exports.exportTable = async (req, res) => {
  try {
    const { tableName } = req.params;
    const { format = 'csv' } = req.query;
    
    // Validate table name
    const allowedTables = [
      'invoices', 'invoice_items', 'purchases', 'purchase_items', 'products',
      'customers', 'suppliers', 'stock_entries', 'warehouses', 'waste_damages',
      'users', 'audit_logs', 'inventory_ledgers', 'attachments', 'sales'
    ];
    
    if (!allowedTables.includes(tableName)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid table name'
      });
    }
    
    // Get the model based on table name
    const modelMap = {
      'invoices': Invoice,
      'invoice_items': InvoiceItem,
      'purchases': Purchase,
      'purchase_items': PurchaseItem,
      'products': Product,
      'customers': Customer,
      'suppliers': Supplier,
      'stock_entries': StockEntry,
      'warehouses': Warehouse,
      'waste_damages': WasteDamage,
      'users': User,
      'audit_logs': AuditLog,
      'inventory_ledgers': InventoryLedger,
      'attachments': Attachment,
      'sales': Sale
    };
    
    const model = modelMap[tableName];
    
    // Fetch all data from the table
    const data = await model.findAll({
      order: [['id', 'ASC']]
    });
    
    // Convert to plain objects
    const plainData = data.map(item => item.toJSON());
    
    if (format === 'csv') {
      const csv = convertToCSV(plainData);
      
      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${tableName}.csv"`);
      
      return res.send(csv);
    } else {
      // Default to JSON
      res.json({
        success: true,
        data: plainData,
        count: plainData.length
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: error.message
    });
  }
};

/**
 * Export filtered data to CSV
 * @route GET /api/export/:tableName/filtered
 * @access Private
 */
exports.exportFilteredData = async (req, res) => {
  try {
    const { tableName } = req.params;
    const { format = 'csv', ...filters } = req.query;
    
    // Validate table name
    const allowedTables = [
      'invoices', 'invoice_items', 'purchases', 'purchase_items', 'products',
      'customers', 'suppliers', 'stock_entries', 'warehouses', 'waste_damages',
      'users', 'audit_logs', 'inventory_ledgers', 'attachments', 'sales'
    ];
    
    if (!allowedTables.includes(tableName)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid table name'
      });
    }
    
    // Get the model based on table name
    const modelMap = {
      'invoices': Invoice,
      'invoice_items': InvoiceItem,
      'purchases': Purchase,
      'purchase_items': PurchaseItem,
      'products': Product,
      'customers': Customer,
      'suppliers': Supplier,
      'stock_entries': StockEntry,
      'warehouses': Warehouse,
      'waste_damages': WasteDamage,
      'users': User,
      'audit_logs': AuditLog,
      'inventory_ledgers': InventoryLedger,
      'attachments': Attachment,
      'sales': Sale
    };
    
    const model = modelMap[tableName];
    
    // Build where clause from filters
    const where = {};
    for (const [key, value] of Object.entries(filters)) {
      if (key !== 'format') {
        where[key] = value;
      }
    }
    
    // Fetch filtered data from the table
    const data = await model.findAll({
      where,
      order: [['id', 'ASC']]
    });
    
    // Convert to plain objects
    const plainData = data.map(item => item.toJSON());
    
    if (format === 'csv') {
      const csv = convertToCSV(plainData);
      
      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${tableName}_filtered.csv"`);
      
      return res.send(csv);
    } else {
      // Default to JSON
      res.json({
        success: true,
        data: plainData,
        count: plainData.length
      });
    }
  } catch (error) {
    console.error('Export filtered data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export filtered data',
      error: error.message
    });
  }
};