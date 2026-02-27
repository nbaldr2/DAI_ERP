const { sequelize, Sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Warehouse = require('./Warehouse');
const Supplier = require('./Supplier');
const Customer = require('./Customer');
const Product = require('./Product');
// Legacy models - to be migrated
const StockEntry = require('./StockEntry');
const InventoryLedger = require('./InventoryLedger');

// New Models
const ProductStock = require('./ProductStock');
const StockBatch = require('./StockBatch');
const StockMovement = require('./StockMovement');
const StockAdjustment = require('./StockAdjustment');
const StockAdjustmentItem = require('./StockAdjustmentItem');
const StockTransfer = require('./StockTransfer');
const StockTransferItem = require('./StockTransferItem');

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
const Quotation = require('./Quotation');
const QuotationItem = require('./QuotationItem');
const DeliveryNote = require('./DeliveryNote');
const Notification = require('./Notification');

// POS Models
const PosSession = require('./PosSession');
const PosOrder = require('./PosOrder');
const PosOrderItem = require('./PosOrderItem');

const Document = require('./Document');


// Define associations

// --- StockBatch (Replaces StockEntry) ---
StockBatch.belongsTo(Purchase, { foreignKey: 'purchase_id', as: 'purchase' });
StockBatch.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
StockBatch.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
StockBatch.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });

Purchase.hasMany(StockBatch, { foreignKey: 'purchase_id', as: 'stock_batches' });
Product.hasMany(StockBatch, { foreignKey: 'product_id', as: 'stock_batches' });
Supplier.hasMany(StockBatch, { foreignKey: 'supplier_id', as: 'stock_batches' });
Warehouse.hasMany(StockBatch, { foreignKey: 'warehouse_id', as: 'stock_batches' });

// --- ProductStock ---
ProductStock.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
ProductStock.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });

Product.hasMany(ProductStock, { foreignKey: 'product_id', as: 'product_stocks' });
Warehouse.hasMany(ProductStock, { foreignKey: 'warehouse_id', as: 'product_stocks' });

// --- StockMovement ---
StockMovement.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
StockMovement.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
StockMovement.belongsTo(StockBatch, { foreignKey: 'batch_id', as: 'batch' });
StockMovement.belongsTo(User, { foreignKey: 'performed_by', as: 'performer' });

Product.hasMany(StockMovement, { foreignKey: 'product_id', as: 'movements' });
StockBatch.hasMany(StockMovement, { foreignKey: 'batch_id', as: 'movements' });

// --- StockAdjustment ---
StockAdjustment.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
StockAdjustment.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });
StockAdjustment.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
StockAdjustment.hasMany(StockAdjustmentItem, { foreignKey: 'adjustment_id', as: 'items' });

StockAdjustmentItem.belongsTo(StockAdjustment, { foreignKey: 'adjustment_id', as: 'adjustment' });
StockAdjustmentItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
StockAdjustmentItem.belongsTo(StockBatch, { foreignKey: 'batch_id', as: 'batch' });

// --- StockTransfer ---
StockTransfer.belongsTo(Warehouse, { foreignKey: 'source_warehouse_id', as: 'source_warehouse' });
StockTransfer.belongsTo(Warehouse, { foreignKey: 'destination_warehouse_id', as: 'destination_warehouse' });
StockTransfer.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
StockTransfer.belongsTo(User, { foreignKey: 'received_by', as: 'receiver' });
StockTransfer.hasMany(StockTransferItem, { foreignKey: 'transfer_id', as: 'items' });

StockTransferItem.belongsTo(StockTransfer, { foreignKey: 'transfer_id', as: 'transfer' });
StockTransferItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
StockTransferItem.belongsTo(StockBatch, { foreignKey: 'batch_id', as: 'batch' });

// --- Legacy Associations (Keep until migrated) ---
StockEntry.belongsTo(Purchase, { foreignKey: 'purchase_id', as: 'purchase' });
StockEntry.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
StockEntry.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
StockEntry.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
StockEntry.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

Warehouse.hasMany(StockEntry, { foreignKey: 'warehouse_id', as: 'stock_entries' });

// Purchase.hasMany(StockEntry, ...); // Commented out to avoid conflict if alias is same, but alias is unique in new models
// ... (Keeping legacy models registered but minimizing conflict)

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

// Document associations
Document.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });
User.hasMany(Document, { foreignKey: 'uploaded_by', as: 'uploaded_documents' });


// Expense associations
Expense.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Expense.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

User.hasMany(Expense, { foreignKey: 'created_by', as: 'expenses_created' });
Supplier.hasMany(Expense, { foreignKey: 'supplier_id', as: 'expenses' });

// Settings associations
Settings.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });

// Quotation associations
Quotation.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
Quotation.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Quotation.hasMany(QuotationItem, { foreignKey: 'quotation_id', as: 'items' });

Customer.hasMany(Quotation, { foreignKey: 'customer_id', as: 'quotations' });
User.hasMany(Quotation, { foreignKey: 'created_by', as: 'quotations_created' });

// QuotationItem associations
QuotationItem.belongsTo(Quotation, { foreignKey: 'quotation_id', as: 'quotation' });
QuotationItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Product.hasMany(QuotationItem, { foreignKey: 'product_id', as: 'quotation_items' });

// DeliveryNote associations
DeliveryNote.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });
DeliveryNote.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
DeliveryNote.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

Invoice.hasMany(DeliveryNote, { foreignKey: 'invoice_id', as: 'delivery_notes' });
Customer.hasMany(DeliveryNote, { foreignKey: 'customer_id', as: 'delivery_notes' });
User.hasMany(DeliveryNote, { foreignKey: 'created_by', as: 'delivery_notes_created' });

// Notification associations
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });

// --- POS Associations ---
PosSession.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
PosSession.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
PosSession.hasMany(PosOrder, { foreignKey: 'session_id', as: 'orders' });

User.hasMany(PosSession, { foreignKey: 'user_id', as: 'pos_sessions' });
Warehouse.hasMany(PosSession, { foreignKey: 'warehouse_id', as: 'pos_sessions' });

PosOrder.belongsTo(PosSession, { foreignKey: 'session_id', as: 'session' });
PosOrder.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
PosOrder.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
PosOrder.hasMany(PosOrderItem, { foreignKey: 'order_id', as: 'items' });

Customer.hasMany(PosOrder, { foreignKey: 'customer_id', as: 'pos_orders' });
User.hasMany(PosOrder, { foreignKey: 'created_by', as: 'pos_orders_created' });

PosOrderItem.belongsTo(PosOrder, { foreignKey: 'order_id', as: 'order' });
PosOrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

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
  // New Models
  ProductStock,
  StockBatch,
  StockMovement,
  StockAdjustment,
  StockAdjustmentItem,
  StockTransfer,
  StockTransferItem,
  // ---
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
  Settings,
  Quotation,
  QuotationItem,
  DeliveryNote,
  Notification,
  // POS
  PosSession,
  PosOrder,
  PosOrderItem,
  Document
};