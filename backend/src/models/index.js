const { sequelize, Sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Warehouse = require('./Warehouse');
const Supplier = require('./Supplier');
const Customer = require('./Customer');
const Product = require('./Product');
const StockEntry = require('./StockEntry');
const InventoryLedger = require('./InventoryLedger');
const WasteDamage = require('./WasteDamage');
const Sale = require('./Sale');
const Purchase = require('./Purchase');
const PurchaseItem = require('./PurchaseItem');
const Invoice = require('./Invoice');
const InvoiceItem = require('./InvoiceItem');
const InvoicePayment = require('./InvoicePayment');
const InvoiceAttachment = require('./InvoiceAttachment');
const AuditLog = require('./AuditLog');
const Attachment = require('./Attachment');
const Expense = require('./Expense');
const Settings = require('./Settings');

// Define associations

// StockEntry associations
StockEntry.belongsTo(Purchase, { foreignKey: 'purchase_id', as: 'purchase' });
StockEntry.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
StockEntry.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
StockEntry.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
StockEntry.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

Purchase.hasMany(StockEntry, { foreignKey: 'purchase_id', as: 'stock_entries' });
Product.hasMany(StockEntry, { foreignKey: 'product_id', as: 'stock_entries' });
Supplier.hasMany(StockEntry, { foreignKey: 'supplier_id', as: 'stock_entries' });
Warehouse.hasMany(StockEntry, { foreignKey: 'warehouse_id', as: 'stock_entries' });
User.hasMany(StockEntry, { foreignKey: 'created_by', as: 'stock_entries_created' });

// InventoryLedger associations
InventoryLedger.belongsTo(StockEntry, { foreignKey: 'stock_entry_id', as: 'stock_entry' });
InventoryLedger.belongsTo(User, { foreignKey: 'performed_by', as: 'performer' });

StockEntry.hasMany(InventoryLedger, { foreignKey: 'stock_entry_id', as: 'ledger_entries' });
User.hasMany(InventoryLedger, { foreignKey: 'performed_by', as: 'ledger_actions' });

// WasteDamage associations
WasteDamage.belongsTo(StockEntry, { foreignKey: 'stock_entry_id', as: 'stock_entry' });
WasteDamage.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

StockEntry.hasMany(WasteDamage, { foreignKey: 'stock_entry_id', as: 'waste_records' });
User.hasMany(WasteDamage, { foreignKey: 'created_by', as: 'waste_entries' });

// Sale associations
Sale.belongsTo(StockEntry, { foreignKey: 'stock_entry_id', as: 'stock_entry' });
Sale.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
Sale.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

StockEntry.hasMany(Sale, { foreignKey: 'stock_entry_id', as: 'sales' });
Customer.hasMany(Sale, { foreignKey: 'customer_id', as: 'sales' });
User.hasMany(Sale, { foreignKey: 'created_by', as: 'sales_created' });

// Purchase associations
Purchase.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
Purchase.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Purchase.hasMany(PurchaseItem, { foreignKey: 'purchase_id', as: 'items' });

Supplier.hasMany(Purchase, { foreignKey: 'supplier_id', as: 'purchases' });
User.hasMany(Purchase, { foreignKey: 'created_by', as: 'purchases_created' });

// PurchaseItem associations
PurchaseItem.belongsTo(Purchase, { foreignKey: 'purchase_id', as: 'purchase' });
PurchaseItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
PurchaseItem.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });

Product.hasMany(PurchaseItem, { foreignKey: 'product_id', as: 'purchase_items' });

// Invoice associations
Invoice.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
Invoice.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
Invoice.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Invoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id', as: 'items' });
Invoice.hasMany(InvoicePayment, { foreignKey: 'invoice_id', as: 'payments' });
Invoice.hasMany(InvoiceAttachment, { foreignKey: 'invoice_id', as: 'attachments' });

Customer.hasMany(Invoice, { foreignKey: 'customer_id', as: 'invoices' });
Supplier.hasMany(Invoice, { foreignKey: 'supplier_id', as: 'invoices' });
User.hasMany(Invoice, { foreignKey: 'created_by', as: 'invoices_created' });

// InvoiceItem associations
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });
InvoiceItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Product.hasMany(InvoiceItem, { foreignKey: 'product_id', as: 'invoice_items' });

// InvoicePayment associations
InvoicePayment.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });
InvoicePayment.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

User.hasMany(InvoicePayment, { foreignKey: 'created_by', as: 'invoice_payments_created' });

// InvoiceAttachment associations
InvoiceAttachment.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });
InvoiceAttachment.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

User.hasMany(InvoiceAttachment, { foreignKey: 'uploaded_by', as: 'invoice_attachments_uploaded' });

// AuditLog associations
AuditLog.belongsTo(User, { foreignKey: 'performed_by', as: 'performer' });
User.hasMany(AuditLog, { foreignKey: 'performed_by', as: 'audit_logs' });

// Attachment associations
Attachment.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });
User.hasMany(Attachment, { foreignKey: 'uploaded_by', as: 'uploads' });

// Expense associations
Expense.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Expense.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

User.hasMany(Expense, { foreignKey: 'created_by', as: 'expenses_created' });
Supplier.hasMany(Expense, { foreignKey: 'supplier_id', as: 'expenses' });

// Settings associations
Settings.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });

// Export all models and sequelize instance
module.exports = {
  sequelize,
  Sequelize,
  User,
  Warehouse,
  Supplier,
  Customer,
  Product,
  StockEntry,
  InventoryLedger,
  WasteDamage,
  Sale,
  Purchase,
  PurchaseItem,
  Invoice,
  InvoiceItem,
  InvoicePayment,
  InvoiceAttachment,
  AuditLog,
  Attachment,
  Expense,
  Settings
};