# Dai Trading ERP Backend

A comprehensive, production-ready ERP backend system for Dai Trading with inventory management, sales tracking, accounting, and Qatar compliance features.

## 🚀 Features

- **Inventory Management**: Complete stock tracking with batch/lot management
- **Single Source of Truth**: Immutable inventory ledger for all stock movements
- **Transactional Safety**: Row-level locking prevents overselling
- **Optimistic Locking**: Version control for concurrent updates
- **Audit Trail**: Complete history of all changes
- **Role-Based Access Control**: 5 user roles (Admin, Warehouse, Sales, Accountant, Viewer)
- **Bilingual Support**: English and Arabic
- **Qatar Compliance**: Ready for bilingual invoices with QR codes
- **Soft Deletes**: Safe data management
- **Expiry Alerts**: Automated cron jobs for near-expiry items

## 📋 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MySQL 8
- **ORM**: Sequelize
- **Authentication**: JWT
- **Validation**: express-validator
- **Cron Jobs**: node-cron
- **Security**: helmet, cors, rate limiting

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # Database configuration
│   ├── models/
│   │   ├── index.js             # Model associations
│   │   ├── User.js              # User model with roles
│   │   ├── Product.js           # Bilingual product catalog
│   │   ├── StockEntry.js        # Stock batches with optimistic locking
│   │   ├── InventoryLedger.js   # Immutable ledger (single source of truth)
│   │   ├── WasteDamage.js       # Waste tracking
│   │   ├── Sale.js              # Sales records
│   │   ├── Invoice.js           # Bilingual invoices
│   │   └── AuditLog.js          # Complete audit trail
│   ├── controllers/
│   │   ├── authController.js    # Authentication endpoints
│   │   └── stockController.js   # Stock management
│   ├── services/
│   │   └── stockService.js      # Business logic with transactions
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── stockRoutes.js
│   │   ├── wasteRoutes.js
│   │   ├── salesRoutes.js
│   │   ├── productRoutes.js
│   │   ├── supplierRoutes.js
│   │   ├── customerRoutes.js
│   │   ├── warehouseRoutes.js
│   │   ├── invoiceRoutes.js
│   │   ├── reportRoutes.js
│   │   └── auditRoutes.js
│   ├── middlewares/
│   │   └── auth.js              # JWT & RBAC middleware
│   ├── migrations/
│   │   └── runner.js            # Database migrations
│   ├── seeders/
│   │   └── runner.js            # Sample data seeder
│   ├── jobs/
│   │   └── expiryAlerts.js      # Cron job for expiry alerts
│   └── server.js                # Express app entry point
├── tests/                       # Test files
├── uploads/                     # File upload directory
├── .env.example                 # Environment variables template
└── package.json
```

## 🔧 Installation & Setup

### 1. Prerequisites

- Node.js 18+ installed
- MySQL 8+ running
- Git

### 2. Clone and Install

```bash
cd backend
npm install
```

### 3. Environment Configuration

Create `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server
PORT=4000
NODE_ENV=development

# Database
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=daifresh
DB_USER=root
DB_PASS=yourpassword

# JWT
JWT_SECRET=your_secure_secret_key_change_this
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=http://localhost:5173

# File Uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Expiry Alerts
EXPIRY_ALERT_DAYS=7
CRON_SCHEDULE=0 2 * * *
RUN_EXPIRY_CHECK_ON_STARTUP=false
```

### 4. Database Setup

Create the database:

```bash
mysql -u root -p
CREATE DATABASE daifresh CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

Run migrations:

```bash
npm run migrate
```

Seed sample data (includes data from 2025-10-24):

```bash
npm run seed
```

### 5. Start the Server

Development mode with auto-reload:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The server will start on `http://localhost:4000`

## 🔐 Default Login Credentials

After seeding, you can login with:

| Username | Password | Role |
|----------|----------|------|
| admin | password123 | ADMIN |
| warehouse_manager | password123 | WAREHOUSE |
| sales_manager | password123 | SALES |
| accountant | password123 | ACCOUNTANT |
| viewer | password123 | VIEWER |

**⚠️ IMPORTANT**: Change these passwords in production!

## 📡 API Documentation

### Base URL

```
http://localhost:4000/api
```

### Authentication

All endpoints (except `/auth/login`) require JWT authentication:

```
Authorization: Bearer <token>
```

---

### Authentication Endpoints

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "admin",
      "name": "System Administrator",
      "role": "ADMIN"
    }
  }
}
```

#### Register User (Admin only)
```http
POST /api/auth/register
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "username": "newuser",
  "password": "password123",
  "name": "New User",
  "role": "WAREHOUSE"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

---

### Stock Management Endpoints

#### Create Stock Entry (Receipt)
```http
POST /api/stock
Authorization: Bearer <token>
Content-Type: application/json

{
  "product_id": 1,
  "supplier_id": 1,
  "warehouse_id": 1,
  "pallets": 10,
  "pallet_weight": 25.5,
  "date_in": "2025-10-24",
  "expiry_date": "2025-11-08",
  "notes": "Fresh arrival from supplier"
}

Response:
{
  "success": true,
  "message": "Stock entry created successfully",
  "data": {
    "id": 12,
    "product_id": 1,
    "total_weight": 255,
    "available_qty": 255,
    "status": "AVAILABLE",
    "version": 1,
    ...
  }
}
```

#### List Stock Entries
```http
GET /api/stock?product_id=1&status=AVAILABLE&page=1&limit=50
Authorization: Bearer <token>

Query Parameters:
- product_id: Filter by product
- supplier_id: Filter by supplier
- warehouse_id: Filter by warehouse
- status: RECEIVED, QUARANTINE, AVAILABLE, CLOSED
- near_expiry_days: Items expiring within N days
- search: Search in notes or product names
- page: Page number (default: 1)
- limit: Items per page (default: 50)
```

#### Get Stock Entry Details
```http
GET /api/stock/:id
Authorization: Bearer <token>

Response includes:
- Stock entry details
- Product, supplier, warehouse info
- Recent ledger entries
- Available quantity
```

#### Update Stock Entry (with Optimistic Locking)
```http
PUT /api/stock/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "version": 1,
  "notes": "Updated notes",
  "expiry_date": "2025-11-15",
  "status": "AVAILABLE"
}

Note: Version must match current version to prevent conflicts.
Returns 409 if version mismatch.
```

#### Get Stock Summary
```http
GET /api/stock/summary?product_id=1&warehouse_id=1
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "total_batches": 10,
    "total_initial_weight": 5000,
    "total_available_weight": 3250,
    "by_product": [...],
    "by_warehouse": [...]
  }
}
```

---

### Waste Management

#### Record Waste (Transactional with Locking)
```http
POST /api/waste
Authorization: Bearer <token>
Content-Type: application/json

{
  "stock_entry_id": 12,
  "waste_weight": 5.25,
  "notes": "Damaged during unloading"
}

Business Rules:
- Locks the stock entry (SELECT FOR UPDATE)
- Validates available quantity
- Creates waste record
- Updates inventory ledger
- Auto-closes batch if balance = 0
- Creates audit log
```

#### List Waste Entries
```http
GET /api/waste?stock_entry_id=12&page=1&limit=50
Authorization: Bearer <token>
```

---

### Sales Management

#### Create Sale (Transactional with Locking)
```http
POST /api/sales
Authorization: Bearer <token>
Content-Type: application/json

{
  "stock_entry_id": 12,
  "customer_id": 2,
  "sold_weight": 100,
  "unit_price": 3.50,
  "sale_date": "2025-10-25",
  "notes": "Regular order"
}

Business Rules:
- Locks the stock entry
- Validates available quantity
- Validates stock is not QUARANTINE or CLOSED
- Creates sale record
- Updates inventory ledger
- Calculates total_amount automatically
- Auto-closes batch if exhausted
```

#### List Sales
```http
GET /api/sales?customer_id=1&date_from=2025-10-01&date_to=2025-10-31&page=1
Authorization: Bearer <token>
```

#### Get Sales Statistics
```http
GET /api/sales/summary/stats?date_from=2025-10-01&date_to=2025-10-31
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "total_sales": 150,
    "total_weight_sold": 5000,
    "total_revenue": 17500,
    "avg_unit_price": 3.5
  }
}
```

---

### Product Management

#### List Products
```http
GET /api/products?search=tomato&category=Vegetables&page=1
Authorization: Bearer <token>
```

#### Create Product
```http
POST /api/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "name_en": "Tomato",
  "name_ar": "طماطم",
  "category": "Vegetables",
  "origin": "Iran",
  "unit": "kg",
  "min_qty": 100,
  "expiry_alert_days": 5,
  "price_per_unit": 3.50
}
```

#### Get/Update/Delete Product
```http
GET /api/products/:id
PUT /api/products/:id
DELETE /api/products/:id
```

---

### Supplier Management

```http
GET /api/suppliers?search=mahshid&country=Iran&page=1
POST /api/suppliers
GET /api/suppliers/:id
PUT /api/suppliers/:id
DELETE /api/suppliers/:id
```

---

### Customer Management

```http
GET /api/customers?type=WHOLESALE&page=1
POST /api/customers
GET /api/customers/:id
PUT /api/customers/:id
DELETE /api/customers/:id
```

---

### Warehouse Management

```http
GET /api/warehouses?page=1
POST /api/warehouses (Admin only)
GET /api/warehouses/:id
PUT /api/warehouses/:id (Admin only)
DELETE /api/warehouses/:id (Admin only)
```

---

### Reports

#### Near-Expiry Report
```http
GET /api/reports/near-expiry?days=7&warehouse_id=1
Authorization: Bearer <token>

Returns items expiring within specified days with:
- Available quantity
- Days until expiry
- Product and warehouse details
```

#### Stock Summary Report
```http
GET /api/reports/stock-summary
Authorization: Bearer <token>

Returns:
- Total stock weight
- Total waste
- Total sold
- Total available
```

#### Sales Revenue Report
```http
GET /api/reports/sales-revenue?date_from=2025-10-01&date_to=2025-10-31
Authorization: Bearer <token>

Returns:
- Total sales and revenue
- Breakdown by customer
- Breakdown by product
```

#### Waste Analysis Report
```http
GET /api/reports/waste-analysis?date_from=2025-10-01
Authorization: Bearer <token>

Returns:
- Total waste weight
- Breakdown by product
- Breakdown by warehouse
```

#### Inventory Valuation Report
```http
GET /api/reports/inventory-valuation
Authorization: Bearer <token>

Returns:
- Current inventory value
- Item-by-item valuation
```

---

### Audit Logs

#### List Audit Logs (Admin/Accountant only)
```http
GET /api/audit-logs?entity_type=stock_entry&action=CREATE&page=1
Authorization: Bearer <admin_token>

Query Parameters:
- entity_type: Type of entity
- entity_id: Specific entity ID
- action: CREATE, UPDATE, DELETE, RESTORE
- performed_by: User ID
- date_from / date_to: Date range
```

#### Get Audit Trail for Entity
```http
GET /api/audit-logs/entity/stock_entry/12
Authorization: Bearer <token>

Returns complete history of changes for stock entry #12
```

#### Get User Activity
```http
GET /api/audit-logs/user/5/activity?date_from=2025-10-01
Authorization: Bearer <admin_token>
```

---

### Ledger

#### Get Ledger Entries for Stock Entry
```http
GET /api/stock/ledger/:stock_entry_id
Authorization: Bearer <token>

Returns all inventory movements for a stock entry:
- RECEIPT: Initial stock receipt
- WASTE: Waste/damage recorded
- SALE: Stock sold
- ADJUSTMENT: Manual adjustments
- TRANSFER: Stock transfers
```

---

## 🔒 Role-Based Access Control

### Role Permissions

| Role | Permissions |
|------|-------------|
| **ADMIN** | Full access to everything |
| **WAREHOUSE** | Create/update stock, record waste, view reports |
| **SALES** | Create sales, view stock, manage customers, view reports |
| **ACCOUNTANT** | View all data, create invoices, manage accounting, view audit logs |
| **VIEWER** | Read-only access to all data |

### Permission Examples

```javascript
// Warehouse role can:
- POST /api/stock (create stock entries)
- POST /api/waste (record waste)
- GET /api/stock (view inventory)

// Sales role can:
- POST /api/sales (create sales)
- POST /api/customers (manage customers)
- GET /api/stock (view available stock)

// Viewer role can:
- GET endpoints only
- No create/update/delete operations
```

---

## 🏗️ Key Design Patterns

### 1. Inventory Ledger Pattern

The `inventory_ledger` table is the **single source of truth** for all stock movements:

```sql
-- Every stock movement creates an immutable ledger entry
INSERT INTO inventory_ledger (
  stock_entry_id,
  movement_type,  -- RECEIPT, WASTE, SALE, ADJUSTMENT, TRANSFER
  qty,            -- Positive for in, negative for out
  balance_after,  -- Running balance (calculated)
  performed_by,
  note
);
```

Available quantity = Latest `balance_after` for a stock_entry_id

### 2. Transactional Safety with Row Locking

All waste and sale operations use database transactions with row-level locking:

```javascript
const transaction = await sequelize.transaction();

// Lock the stock entry (SELECT FOR UPDATE)
const stockEntry = await StockEntry.findByPk(id, {
  lock: transaction.LOCK.UPDATE,
  transaction
});

// Validate and update
// ...

await transaction.commit();
```

This prevents race conditions and overselling.

### 3. Optimistic Locking

Stock entries use version numbers to prevent conflicting updates:

```javascript
// Update requires version number
{
  "version": 1,
  "notes": "Updated"
}

// Version is checked and incremented
// Returns 409 if mismatch
```

### 4. Soft Deletes

All main tables support soft deletes via `deleted_at` column:

```javascript
// Delete doesn't remove data
await product.destroy(); // Sets deleted_at

// Restore is possible
await product.restore(); // Clears deleted_at
```

### 5. Audit Trail

Every create/update/delete operation is logged:

```javascript
await AuditLog.logChange({
  entity_type: 'stock_entry',
  entity_id: 12,
  action: 'UPDATE',
  old_value: {...},
  new_value: {...},
  performed_by: userId,
  ip_address: req.ip,
  user_agent: req.get('user-agent')
});
```

---

## ⏰ Cron Jobs

### Expiry Alerts

Automatically checks for expiring items daily:

```javascript
// Configuration
EXPIRY_ALERT_DAYS=7          // Alert 7 days before expiry
CRON_SCHEDULE=0 2 * * *      // Runs daily at 2 AM Qatar time
RUN_EXPIRY_CHECK_ON_STARTUP=false
```

The job:
1. Finds items expiring within N days
2. Checks available quantities
3. Logs alerts with urgency levels (🔴 ≤3 days, 🟠 ≤5 days, 🟡 ≤7 days)
4. Can be extended to send emails/SMS

Manual trigger:
```javascript
const { runExpiryChecks } = require('./src/jobs/expiryAlerts');
await runExpiryChecks();
```

---

## 🧪 Testing

Run tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm test -- --coverage
```

---

## 📊 Database Backup

### Manual Backup

```bash
mysqldump -u root -p daifresh > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore from Backup

```bash
mysql -u root -p daifresh < backup_20251024_140000.sql
```

### Automated Backup Script

Create a backup script:

```bash
#!/bin/bash
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mysqldump -u root -p daifresh > $BACKUP_DIR/daifresh_$DATE.sql
gzip $BACKUP_DIR/daifresh_$DATE.sql
# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

---

## 🔐 Security Best Practices

### 1. Environment Variables

Never commit `.env` to version control. Use strong secrets in production:

```bash
# Generate a strong JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. HTTPS

Always use HTTPS in production. Configure Nginx as reverse proxy:

```nginx
server {
    listen 443 ssl;
    server_name api.daitrading.qa;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. Rate Limiting

Already configured in the app. Adjust in `.env`:

```env
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100    # Max 100 requests per window
```

### 4. JWT Token Expiry

Set appropriate token expiry:

```env
JWT_EXPIRES_IN=8h  # Production: shorter expiry
```

### 5. Database Security

- Use strong passwords
- Limit database user permissions
- Enable SSL for database connections
- Regular backups

---

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET`
- [ ] Configure database with production credentials
- [ ] Set up HTTPS/SSL
- [ ] Configure proper CORS origins
- [ ] Set up automated backups
- [ ] Configure process manager (PM2)
- [ ] Set up monitoring and logging
- [ ] Review and adjust rate limits
- [ ] Change all default passwords

### Using PM2

Install PM2:

```bash
npm install -g pm2
```

Start the app:

```bash
pm2 start src/server.js --name dai-trading-api
pm2 save
pm2 startup
```

Monitor:

```bash
pm2 status
pm2 logs dai-trading-api
pm2 monit
```

---

## 📝 API Testing with cURL

### Complete Flow Example

```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}' \
  | jq -r '.data.token')

# 2. Create Stock Entry
curl -X POST http://localhost:4000/api/stock \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "supplier_id": 1,
    "warehouse_id": 1,
    "pallets": 10,
    "pallet_weight": 25.5,
    "date_in": "2025-10-24",
    "expiry_date": "2025-11-08",
    "notes": "Test stock entry"
  }'

# 3. Record Waste
curl -X POST http://localhost:4000/api/waste \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stock_entry_id": 1,
    "waste_weight": 5.25,
    "notes": "Damaged during unloading"
  }'

# 4. Create Sale
curl -X POST http://localhost:4000/api/sales \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stock_entry_id": 1,
    "customer_id": 1,
    "sold_weight": 100,
    "unit_price": 3.50,
    "sale_date": "2025-10-25"
  }'

# 5. Get Stock Summary
curl -X GET http://localhost:4000/api/reports/stock-summary \
  -H "Authorization: Bearer $TOKEN"

# 6. Get Near-Expiry Items
curl -X GET "http://localhost:4000/api/reports/near-expiry?days=7" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🐛 Troubleshooting

### Database Connection Failed

```bash
# Check MySQL is running
sudo systemctl status mysql

# Test connection
mysql -u root -p -e "SELECT 1"

# Check credentials in .env
```

### Port Already in Use

```bash
# Find process using port 4000
lsof -i :4000

# Kill the process
kill -9 <PID>

# Or use different port in .env
PORT=4001
```

### Migration Errors

```bash
# Rollback migrations
node src/migrations/runner.js rollback

# Re-run migrations
npm run migrate
```

### Seeder Issues

```bash
# Clear and re-seed
mysql -u root -p -e "DROP DATABASE daifresh; CREATE DATABASE daifresh;"
npm run migrate
npm run seed
```

---

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Sequelize Documentation](https://sequelize.org/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [JWT.io](https://jwt.io/)

---

## 📄 License

ISC

---

## 👥 Support

For issues or questions, please contact the development team.

---

**Built with ❤️ for Dai Trading**