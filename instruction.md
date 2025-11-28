Dai Trading — Full-stack ERP (React + Express + postgresql+ prisma ORM) — Inventory Ledger, Accounting, Qatar Compliance

Context / Goal

Build a production-ready, bilingual (English + Arabic) ERP for Dai Trading that covers Stock Management, Purchases, Sales, Accounting, Reporting, User Management (roles) and Qatar compliance features (bilingual invoices + QR, audit trail). Focus on correctness, concurrency safety, auditability, and clear inventory/accounting flows.

Tech stack

Frontend: React.js (Vite) + React Router + Axios + TailwindCSS + react-i18next

Backend: Node.js (18+) + Express.js + Sequelize (MySQL dialect)

Database: MySQL 8 (use migrations)

Auth: JWT with role-based middleware

File uploads: multer (local adapter + pluggable S3 adapter)

Reports: Chart.js on frontend; CSV/PDF export endpoints on backend (pdfkit/puppeteer)

Testing: Jest + Supertest (basic stubs for critical flows)

Async jobs: node-cron for expiry alerts / nightly reconciliations

Hosting: Ubuntu 22.04 / Nginx-ready

Key design principles (must be implemented)

Single source of truth for stock: inventory_ledger records all immutable stock movements; ledger snapshots (balance_after) are used to compute available qty.

Transactional operations: All waste and sale operations must run inside DB transactions and lock affected stock_entries rows (SELECT FOR UPDATE / Sequelize row locks) to prevent overselling.

Optimistic locking: stock_entries.version used for concurrent metadata updates; mismatch returns HTTP 409.

Soft deletes + audit logs: Soft delete (deleted_at) on main tables; audit_logs captures old/new JSON + user + timestamp.

Role-based access control: JWT middleware with roles ADMIN, WAREHOUSE, SALES, ACCOUNTANT, VIEWER. Enforce in routes.

Validation & business rules: Validate dates, weights, non-negative numbers, and enforce waste/sale <= available.

Bilingual output: All invoice PDFs and UI-ready text support English and Arabic (react-i18next).

Export: CSV/PDF export endpoints for inventory, waste, sales, near-expiry.

Database schema (essential — generate migrations)

users

id INT PK AUTO_INCREMENT, username VARCHAR(100) UNIQUE, password_hash VARCHAR(255),
name VARCHAR(150), role ENUM('ADMIN','WAREHOUSE','SALES','ACCOUNTANT','VIEWER'),
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP


warehouses

id, name, location, created_at, deleted_at


suppliers

id, name, contact_person, phone, email, address, country, created_at, updated_at, deleted_at


customers

id, name, contact, address, type ENUM('RETAIL','WHOLESALE'), credit_limit DECIMAL, created_at, deleted_at


products

id, name_en, name_ar, category, origin, unit DEFAULT 'kg', min_qty, expiry_alert_days INT, price_per_unit DECIMAL, created_at, updated_at, deleted_at


stock_entries (batches / lots)

id PK, product_id FK, supplier_id FK, warehouse_id FK,
pallets INT DEFAULT 0, pallet_weight DECIMAL(10,2) NOT NULL, total_weight DECIMAL(12,2) NOT NULL,
date_in DATE NOT NULL, expiry_date DATE NOT NULL,
status ENUM('RECEIVED','QUARANTINE','AVAILABLE','CLOSED') DEFAULT 'RECEIVED',
version INT DEFAULT 1,
notes TEXT, created_at, updated_at, deleted_at


inventory_ledger

id PK, stock_entry_id FK, movement_type ENUM('RECEIPT','WASTE','SALE','ADJUSTMENT','TRANSFER'),
qty DECIMAL(12,2) NOT NULL,   -- positive for receipts, negative for outs
reference_type VARCHAR(50), reference_id INT,
balance_after DECIMAL(12,2) NOT NULL,
performed_by INT (FK users), performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, note TEXT


waste_damage

id PK, stock_entry_id FK, waste_weight DECIMAL(10,2), notes TEXT, created_at TIMESTAMP, created_by INT


sales

id PK, stock_entry_id FK, sold_weight DECIMAL(10,2), sale_date DATE NOT NULL, created_at, created_by INT


purchases / purchase_items / grn / supplier_invoices (standard PO flow)

purchases(id, supplier_id, po_number, order_date, expected_date, status, total, created_at)

purchase_items(id, purchase_id, product_id, qty, unit_price, total_price)

grn(id, purchase_id, stock_entry_id, received_date, received_by, notes)

invoices / invoice_lines

invoices(id, sale_id / purchase_id, invoice_number, issue_date, due_date, total_net, total_tax, total_gross, pdf_path, qr_code, created_by)

invoice_lines(id, invoice_id, product_id, qty, unit_price, discount, tax_rate)

journal_entries / journal_lines

journal_entries(id, date, reference, narration, posted_flag, created_by)

journal_lines(id, journal_id, account_code, debit, credit, cost_center)

payments

id, reference_type, reference_id, amount, method, bank_ref, payment_date, created_by


attachments

id, entity_type, entity_id, filename, path, mime_type, size, uploaded_by, uploaded_at


audit_logs

id, entity_type, entity_id, action, old_value JSON, new_value JSON, performed_by, performed_at

Business rules (must be implemented)

Create stock entry (receipt):

Validate payload: pallets >=0, pallet_weight > 0, expiry >= date_in.

Compute total_weight = pallets * pallet_weight if not provided.

Insert stock_entries row, default status = 'AVAILABLE' unless QUARANTINE.

Insert inventory_ledger with movement_type='RECEIPT', qty = total_weight, balance_after = total_weight.

Create audit log and attachments support.

Return full stock_entry with latest ledger snapshot.

Calculate available stock for a batch: last inventory_ledger.balance_after for that stock_entry_id.

Get aggregated product stock: sum of latest balances across stock_entries where status in AVAILABLE/RECEIVED.

Create waste/damage:

Start DB transaction; lock stock_entries row (FOR UPDATE) OR use Sequelize row lock.

Determine available = latest ledger.balance_after.

Reject if waste_weight > available (400).

Insert waste_damage record, insert inventory_ledger row with movement_type='WASTE' and qty = -waste_weight, update balance_after.

If balance_after <= 0 set stock_entry.status='CLOSED'.

Create audit log, commit.

Create sale:

Transactional; lock batch.

Validate sold_weight <= available.

Insert sales record, insert inventory_ledger row movement_type='SALE' qty = -sold_weight, update balance_after.

If needed, create invoices and auto-post accounting journal entries (AR/Revenue).

If batch exhausted, set status CLOSED.

Audit log.

Optimistic locking: when updating metadata of stock_entry (notes, expiry_date), require version in payload; increment version on success; if mismatch -> 409.

Accounting automation: on confirmed purchase (GRN + supplier invoice) and on confirmed sale/invoice, auto-generate journal entries:

Purchase Receipt: Debit Inventory, Credit GRN Liability / PO accrual.

Purchase Invoice: Debit Inventory/Expense (landed cost split), Credit Accounts Payable.

Sale Invoice: Debit Accounts Receivable, Credit Revenue. Cost of Goods Sold entry if COGS tracked by inventory valuation method.

Allow manual journal entries too.

Expiry alerts: job to create alerts for items expiring in N days (configurable), stored in alerts table and visible in dashboard.

API endpoints (implement with validation, pagination, filters, RBAC)

Auth

POST /api/auth/login -> { token, user }

POST /api/auth/register (admin only)

GET /api/auth/me

Suppliers

GET /api/suppliers?search&page&limit

POST /api/suppliers

GET /api/suppliers/:id

PUT /api/suppliers/:id

DELETE /api/suppliers/:id (soft delete)

Products

GET /api/products?search&category

POST /api/products

PUT /api/products/:id

DELETE /api/products/:id

Stock (batches)

GET /api/stock?product_id&supplier_id&status&near_expiry_days&page&limit

POST /api/stock (create receipt) — role: WAREHOUSE/ADMIN

GET /api/stock/:id -> includes latest ledger entries & attachments

PUT /api/stock/:id -> metadata updates (optimistic locking)

DELETE /api/stock/:id (soft delete)

POST /api/stock/:id/attach (file upload)

Waste

POST /api/waste -> { stock_entry_id, waste_weight, notes } transactional role: WAREHOUSE/ADMIN

GET /api/waste?stock_entry_id&page&limit

Sales

POST /api/sales -> { stock_entry_id, sold_weight, sale_date, create_invoice: bool } transactional role: SALES/ADMIN

GET /api/sales?product_id&date_from&date_to&page&limit

Ledger & Aggregates

GET /api/ledger/:stock_entry_id

GET /api/stock/summary -> { total_stock_kg, total_waste_kg, total_sold_kg, by_product: [...] }

GET /api/reports/near-expiry?days=7&warehouse_id

Accounting

POST /api/invoices (generate invoice; bilingual PDF with QR)

GET /api/invoices/:id/download

POST /api/payments

GET /api/reports/pnl

GET /api/reports/balance-sheet

Admin / Health

GET /api/health

POST /api/admin/reconcile (admin triggers reconciliation)

GET /api/audit-logs?entity_type&entity_id

Frontend requirements (React + Vite)

App skeleton with routes:

/login
/dashboard
/products
/suppliers
/stock
/stock/:id
/waste
/sales
/invoices
/accounting
/reports
/settings


Use TailwindCSS for styling; green accent #16a34a. Provide light theme.

Use react-i18next for bilingual labels & Arabic layout direction (RTL) toggling.

DataTables-style listings (react-table or Material-UI DataGrid) with filters (supplier/product/date).

Forms with react-hook-form and client-side validation.

Axios for API calls; include JWT token in headers.

Dashboard: KPI cards (Total Stock, Total Waste, Sold, Remaining), charts (Chart.js).

Stock pages:

"Store Inventory" table: show batch rows with pallet count, pallet weight, total weight, date in, expiry date, supplier, notes, available qty (ledger snapshot), actions (waste, sale, attach).

"Waste & Damage Inventory" table.

"Inventory After Sales" table (or combined with filters).

Row color-coding for near-expiry (e.g., <7 days = red/orange).

Export to Excel/PDF from UI (calls backend export endpoints).

Invoice viewer modal with download PDF.

Seed data (must include 24/10/2025 sample)

Supplier: Mahshid Mehregan (include contact, phone, country)

Products: Tomato, Cabbage, Sweet Pepper, Eggplant, Beetroot, Onion, Pumpkin

Stock entries dated 2025-10-24 with realistic pallets & pallet_weight, total_weight computed, expiry dates (some near-expiry), notes.

Create initial inventory_ledger RECEIPT entries for each stock_entry.

Create a sample waste entry and a sample sale entry to demonstrate ledger reductions.

Deliverables (expected from code generator)

Backend folder with:

Express app, structured controllers/services/routes/middlewares

Sequelize models, migrations, and seed scripts

Transactional service functions that implement locking & ledger snapshots

JWT auth & role middleware

File upload handlers (multer) + attachments table

Export endpoints (CSV/PDF)

Cron job for expiry alerts

README, .env.example, and Postman collection / sample curl commands

Frontend folder with:

React + Vite app, pages, components, i18n setup

Integration with backend via Axios example services

Dashboard and main CRUD pages (products, suppliers, stock, waste, sales, invoices, reports)

Invoice PDF viewer & download

Instructions to run (npm install, env, start)

Tests:

Basic Jest + Supertest stubs for critical transactional flows (waste creation, sale creation) demonstrating locking & rollback.

Documentation:

README with setup, migrations, seeding, running dev, environment vars, and key curl examples.

Example curl flows (include in README / Postman)

Create stock (receipt):

curl -X POST https://api.example.com/api/stock \
 -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
 -d '{"product_id":1,"supplier_id":1,"warehouse_id":1,"pallets":10,"pallet_weight":25.5,"date_in":"2025-10-24","expiry_date":"2025-11-08","notes":"Arrival from Mahshid Mehregan"}'


Create waste (transactional):

curl -X POST https://api.example.com/api/waste \
 -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
 -d '{"stock_entry_id":12,"waste_weight":5.25,"notes":"Damaged during unloading"}'


Create sale (transactional + invoice):

curl -X POST https://api.example.com/api/sales \
 -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
 -d '{"stock_entry_id":12,"sold_weight":100,"sale_date":"2025-10-25","create_invoice":true,"customer_id":2}'

Non-functional & ops notes

Proper HTTP error codes & JSON error payloads.

Limit request sizes for uploads; sanitize file names.

Use environment variables for DB & JWT secrets. Example .env.example:

PORT=4000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=daifresh
DB_USER=root
DB_PASS=yourpassword
JWT_SECRET=supersecretkey
UPLOAD_DIR=./uploads


Provide DB backup/restore commands in README. Recommend daily dumps and off-site storage.

Provide basic security recommendations (TLS, rate limiting, strong JWT expiry, rotate secrets).

Final instruction to codegen model / developer

Generate the complete codebase (backend + frontend) with the above requirements, include migrations, seed script with the provided 24/10/2025 sample, and provide a short demo script in README showing:

Run migrations & seed.

Start backend and frontend.

Login as seeded admin.

Create a stock batch, record a waste, create a sale and download invoice.