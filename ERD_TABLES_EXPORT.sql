-- Dai Trading ERP System - Complete Database Schema Export
-- Generated on: 2025-11-02
-- This file contains the complete database schema for all tables in the system

-- 1. USERS Table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(150) NOT NULL,
  role ENUM('ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTANT', 'VIEWER') NOT NULL DEFAULT 'VIEWER',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. CUSTOMERS Table
CREATE TABLE customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  contact VARCHAR(100),
  address TEXT,
  type ENUM('RETAIL', 'WHOLESALE') NOT NULL DEFAULT 'RETAIL',
  credit_limit DECIMAL(12,2),
  balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  INDEX idx_customers_deleted_at (deleted_at)
);

-- 3. SUPPLIERS Table
CREATE TABLE suppliers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(150),
  phone VARCHAR(50),
  email VARCHAR(100),
  address TEXT,
  country VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  INDEX idx_suppliers_deleted_at (deleted_at)
);

-- 4. PRODUCTS Table
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name_en VARCHAR(150) NOT NULL,
  name_ar VARCHAR(150),
  category VARCHAR(100),
  origin VARCHAR(100),
  unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  min_qty DECIMAL(10,2) DEFAULT 0,
  expiry_alert_days INTEGER DEFAULT 7,
  price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  INDEX idx_products_deleted_at (deleted_at)
);

-- 5. WAREHOUSES Table
CREATE TABLE warehouses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  location VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  INDEX idx_warehouses_deleted_at (deleted_at)
);

-- 6. PURCHASES Table
CREATE TABLE purchases (
  id INT PRIMARY KEY AUTO_INCREMENT,
  supplier_id INT NOT NULL,
  po_number VARCHAR(100) NOT NULL UNIQUE,
  order_date DATE NOT NULL,
  expected_date DATE,
  status ENUM('DRAFT', 'SENT', 'CONFIRMED', 'RECEIVED', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT NOT NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_purchases_supplier_id (supplier_id),
  INDEX idx_purchases_created_by (created_by)
);

-- 7. PURCHASE_ITEMS Table
CREATE TABLE purchase_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  purchase_id INT NOT NULL,
  product_id INT NOT NULL,
  warehouse_id INT,
  quantity DECIMAL(12,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL,
  INDEX idx_purchase_items_purchase_id (purchase_id),
  INDEX idx_purchase_items_product_id (product_id),
  INDEX idx_purchase_items_warehouse_id (warehouse_id)
);

-- 8. STOCK_ENTRIES Table
CREATE TABLE stock_entries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  purchase_id INT,
  product_id INT NOT NULL,
  supplier_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  pallets INT NOT NULL DEFAULT 0,
  pallet_weight DECIMAL(10,2) NOT NULL,
  total_weight DECIMAL(12,2) NOT NULL,
  received_weight DECIMAL(12,2),
  accepted_weight DECIMAL(12,2),
  date_in DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status ENUM('PENDING', 'RECEIVED', 'INSPECTED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
  version INT NOT NULL DEFAULT 1,
  notes TEXT,
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_stock_entries_purchase_id (purchase_id),
  INDEX idx_stock_entries_product_id (product_id),
  INDEX idx_stock_entries_supplier_id (supplier_id),
  INDEX idx_stock_entries_warehouse_id (warehouse_id),
  INDEX idx_stock_entries_created_by (created_by),
  INDEX idx_stock_entries_deleted_at (deleted_at)
);

-- 9. INVOICES Table
CREATE TABLE invoices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  invoice_number VARCHAR(100) NOT NULL UNIQUE,
  invoice_type ENUM('SALE', 'PURCHASE') NOT NULL DEFAULT 'SALE',
  reference_type VARCHAR(50),
  reference_id INT,
  customer_id INT,
  supplier_id INT,
  invoice_date DATE NOT NULL,
  due_date DATE,
  total_net DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_tax DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_gross DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount DECIMAL(10,2) DEFAULT 0.00,
  status ENUM('DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  pdf_path VARCHAR(500),
  qr_code TEXT,
  language ENUM('EN', 'AR', 'BOTH') NOT NULL DEFAULT 'BOTH',
  notes TEXT,
  admin_note TEXT,
  client_note TEXT,
  terms TEXT,
  currency VARCHAR(3) DEFAULT 'QAR',
  sale_agent VARCHAR(100),
  discount_type ENUM('none', 'percentage', 'fixed') DEFAULT 'none',
  discount_value DECIMAL(12,2) DEFAULT 0.00,
  subtotal DECIMAL(12,2) DEFAULT 0.00,
  total_discount DECIMAL(12,2) DEFAULT 0.00,
  total DECIMAL(12,2) DEFAULT 0.00,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT NOT NULL,
  payment_mode VARCHAR(50),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_invoices_customer_id (customer_id),
  INDEX idx_invoices_supplier_id (supplier_id),
  INDEX idx_invoices_created_by (created_by)
);

-- 10. INVOICE_ITEMS Table
CREATE TABLE invoice_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  invoice_id INT NOT NULL,
  product_id INT NOT NULL,
  description TEXT,
  quantity DECIMAL(12,2) NOT NULL DEFAULT 1,
  rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(5,2) NOT NULL DEFAULT 0,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_invoice_items_invoice_id (invoice_id),
  INDEX idx_invoice_items_product_id (product_id)
);

-- 11. SALES Table
CREATE TABLE sales (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stock_entry_id INT NOT NULL,
  customer_id INT,
  sold_weight DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(12,2) DEFAULT 0.00,
  sale_date DATE NOT NULL,
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INT NOT NULL,
  FOREIGN KEY (stock_entry_id) REFERENCES stock_entries(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_sales_stock_entry_id (stock_entry_id),
  INDEX idx_sales_customer_id (customer_id),
  INDEX idx_sales_created_by (created_by)
);

-- 12. WASTE_DAMAGE Table
CREATE TABLE waste_damage (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stock_entry_id INT NOT NULL,
  reason ENUM('WASTE', 'DAMAGE', 'HEALTH_TEST', 'SPOILED', 'OTHER') NOT NULL DEFAULT 'WASTE',
  waste_weight DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INT NOT NULL,
  FOREIGN KEY (stock_entry_id) REFERENCES stock_entries(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_waste_damage_stock_entry_id (stock_entry_id),
  INDEX idx_waste_damage_created_by (created_by)
);

-- 13. INVENTORY_LEDGER Table
CREATE TABLE inventory_ledger (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stock_entry_id INT NOT NULL,
  movement_type ENUM('RECEIPT', 'WASTE', 'SALE', 'ADJUSTMENT', 'TRANSFER') NOT NULL,
  qty DECIMAL(12,2) NOT NULL,
  reference_type VARCHAR(50),
  reference_id INT,
  balance_after DECIMAL(12,2) NOT NULL,
  performed_by INT NOT NULL,
  performed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note TEXT,
  FOREIGN KEY (stock_entry_id) REFERENCES stock_entries(id),
  FOREIGN KEY (performed_by) REFERENCES users(id),
  INDEX idx_inventory_ledger_stock_entry_id_performed_at (stock_entry_id, performed_at),
  INDEX idx_inventory_ledger_movement_type (movement_type),
  INDEX idx_inventory_ledger_reference (reference_type, reference_id),
  INDEX idx_inventory_ledger_performed_by (performed_by)
);

-- 14. AUDIT_LOGS Table
CREATE TABLE audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  entity_type VARCHAR(100) NOT NULL,
  entity_id INT NOT NULL,
  action ENUM('CREATE', 'UPDATE', 'DELETE', 'RESTORE') NOT NULL,
  old_value JSON,
  new_value JSON,
  changes JSON,
  performed_by INT NOT NULL,
  performed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  notes TEXT,
  FOREIGN KEY (performed_by) REFERENCES users(id),
  INDEX idx_audit_logs_entity (entity_type, entity_id),
  INDEX idx_audit_logs_performed_by (performed_by),
  INDEX idx_audit_logs_performed_at (performed_at),
  INDEX idx_audit_logs_action (action)
);

-- 15. ATTACHMENTS Table
CREATE TABLE attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  entity_type VARCHAR(100) NOT NULL,
  entity_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size INT NOT NULL,
  description TEXT,
  uploaded_by INT NOT NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  INDEX idx_attachments_entity (entity_type, entity_id),
  INDEX idx_attachments_uploaded_by (uploaded_by)
);

-- 16. INVOICE_PAYMENTS Table
CREATE TABLE invoice_payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  invoice_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  reference VARCHAR(100),
  notes TEXT,
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_invoice_payments_invoice_id (invoice_id),
  INDEX idx_invoice_payments_created_by (created_by)
);

-- 17. INVOICE_ATTACHMENTS Table
CREATE TABLE invoice_attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  invoice_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INT,
  uploaded_by INT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  INDEX idx_invoice_attachments_invoice_id (invoice_id),
  INDEX idx_invoice_attachments_uploaded_by (uploaded_by)
);