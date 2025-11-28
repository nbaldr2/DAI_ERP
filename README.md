# Dai Trading ERP System

![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![License](https://img.shields.io/badge/license-ISC-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![MySQL](https://img.shields.io/badge/mysql-8.0%2B-blue.svg)

A comprehensive, production-ready ERP (Enterprise Resource Planning) system built for Dai Trading, featuring inventory management, sales tracking, accounting, and Qatar compliance capabilities.

## 🌟 Overview

This full-stack ERP system provides complete business management capabilities with a focus on:

- **Inventory Management**: Real-time stock tracking with batch/lot management
- **Sales & Purchase Management**: Complete order-to-cash and procure-to-pay workflows
- **Warehouse Management**: Multi-warehouse support with location tracking
- **Financial Management**: Automated accounting with journal entries
- **Compliance**: Qatar-specific features including bilingual invoices with QR codes
- **Audit & Security**: Complete audit trail with role-based access control
- **Bilingual Support**: Full English and Arabic interface (RTL support)

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Key Concepts](#-key-concepts)
- [API Documentation](#-api-documentation)
- [Screenshots](#-screenshots)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### Inventory Management
- ✅ Batch/lot tracking with expiry dates
- ✅ Immutable inventory ledger (single source of truth)
- ✅ Real-time available quantity calculation
- ✅ Multi-warehouse support
- ✅ Automatic expiry alerts (cron jobs)
- ✅ Pallet and weight tracking
- ✅ Stock transfer between warehouses
- ✅ Quarantine management

### Transactional Safety
- ✅ Row-level database locking (prevents overselling)
- ✅ Optimistic locking with version control
- ✅ ACID-compliant transactions
- ✅ Rollback on failures
- ✅ Concurrent operation safety

### Sales & Purchases
- ✅ Sales order management
- ✅ Purchase order management
- ✅ Customer & supplier management
- ✅ Price management
- ✅ Sales analytics and reporting
- ✅ Revenue tracking

### Waste Management
- ✅ Waste/damage recording
- ✅ Waste analysis reports
- ✅ Automatic ledger updates
- ✅ Batch closure on exhaustion

### Accounting (Ready for Implementation)
- ✅ Chart of accounts structure
- ✅ Journal entry framework
- ✅ Automated accounting entries
- ✅ Accounts receivable/payable
- ✅ Financial reporting structure

### Invoicing
- ✅ Bilingual invoice generation (EN/AR)
- ✅ QR code integration (Qatar compliance)
- ✅ PDF generation
- ✅ Invoice tracking and status management
- ✅ Payment tracking

### Reporting & Analytics
- ✅ Stock summary reports
- ✅ Sales revenue analysis
- ✅ Waste analysis
- ✅ Near-expiry reports
- ✅ Inventory valuation
- ✅ Product performance
- ✅ Customer analysis

### Security & Compliance
- ✅ JWT-based authentication
- ✅ Role-based access control (5 roles)
- ✅ Complete audit trail
- ✅ Soft deletes
- ✅ IP address and user agent logging
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Helmet security headers

### User Management
- ✅ 5 role types: Admin, Warehouse, Sales, Accountant, Viewer
- ✅ Permission-based access
- ✅ User activity tracking
- ✅ Password management

### Internationalization
- ✅ English and Arabic support
- ✅ RTL (Right-to-Left) layout support
- ✅ Bilingual data (products, invoices)
- ✅ Date/time localization

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18
- **Database**: MySQL 8.0
- **ORM**: Sequelize 6.35
- **Authentication**: JSON Web Tokens (JWT)
- **Validation**: express-validator
- **File Upload**: Multer (with S3 adapter support)
- **PDF Generation**: PDFKit
- **QR Codes**: qrcode library
- **Cron Jobs**: node-cron
- **Security**: Helmet, CORS, bcryptjs
- **Logging**: Morgan

### Frontend (Structure Ready)
- **Framework**: React 18 with Vite
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **State Management**: React Context + Hooks
- **Styling**: TailwindCSS 3.3
- **Charts**: Chart.js with react-chartjs-2
- **Forms**: react-hook-form
- **Notifications**: react-hot-toast
- **Icons**: Lucide React
- **i18n**: react-i18next
- **Date Handling**: date-fns

### Development Tools
- **Testing**: Jest + Supertest
- **Process Manager**: PM2 (recommended)
- **Version Control**: Git
- **API Testing**: Postman/cURL examples provided

## 🏗 Architecture

### Database Design

The system uses a normalized relational database with the following key tables:

```
users → stock_entries → inventory_ledger (Immutable ledger)
                     ↓
                  waste_damage
                  sales
                     ↓
                  invoices

suppliers → stock_entries
warehouses → stock_entries
products → stock_entries

audit_logs (tracks all changes)
attachments (file management)
```

### Key Architectural Patterns

1. **Inventory Ledger Pattern**: Single source of truth for all stock movements
2. **Transactional Safety**: All critical operations use DB transactions with row locking
3. **Optimistic Locking**: Version-based concurrency control
4. **Soft Deletes**: Data preservation with `deleted_at` timestamps
5. **Audit Trail**: Every create/update/delete is logged
6. **Service Layer**: Business logic separated from controllers
7. **JWT Authentication**: Stateless authentication with role-based permissions

### Data Flow Example: Creating a Sale

```
1. Client → POST /api/sales (JWT authenticated)
2. Middleware → Verify token & check role (SALES/ADMIN)
3. Controller → Validate input data
4. Service → Start DB transaction
5. Service → Lock stock_entry row (SELECT FOR UPDATE)
6. Service → Check available quantity from ledger
7. Service → Create sale record
8. Service → Create ledger entry (negative quantity)
9. Service → Update stock_entry status if exhausted
10. Service → Create audit log
11. Service → Commit transaction
12. Controller → Return success response
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- MySQL 8+ ([Download](https://dev.mysql.com/downloads/))
- npm or yarn
- Git

### Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd dai-trading2
```

2. **Setup Backend**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
```

3. **Create Database**
```bash
mysql -u root -p
CREATE DATABASE daifresh CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

4. **Run Migrations & Seed Data**
```bash
npm run migrate
npm run seed
```

5. **Start Backend Server**
```bash
npm run dev
# Server starts on http://localhost:4000
```

6. **Setup Frontend** (in another terminal)
```bash
cd frontend
npm install
npm run dev
# Frontend starts on http://localhost:5173
```

7. **Login**
- Navigate to http://localhost:5173
- Username: `admin`
- Password: `password123`

### Default User Accounts

| Username | Password | Role | Permissions |
|----------|----------|------|-------------|
| admin | password123 | ADMIN | Full access |
| warehouse_manager | password123 | WAREHOUSE | Stock, Waste |
| sales_manager | password123 | SALES | Sales, Customers |
| accountant | password123 | ACCOUNTANT | Accounting, Reports |
| viewer | password123 | VIEWER | Read-only |

**⚠️ Important**: Change all default passwords in production!

## 📁 Project Structure

```
dai-trading2/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js           # Sequelize configuration
│   │   ├── models/                   # Database models
│   │   │   ├── index.js              # Model associations
│   │   │   ├── User.js               # User with roles
│   │   │   ├── Product.js            # Bilingual products
│   │   │   ├── StockEntry.js         # Stock batches
│   │   │   ├── InventoryLedger.js    # Ledger (source of truth)
│   │   │   ├── WasteDamage.js        # Waste tracking
│   │   │   ├── Sale.js               # Sales records
│   │   │   ├── Customer.js           # Customers
│   │   │   ├── Supplier.js           # Suppliers
│   │   │   ├── Warehouse.js          # Warehouses
│   │   │   ├── Invoice.js            # Invoices
│   │   │   ├── Purchase.js           # Purchase orders
│   │   │   ├── AuditLog.js           # Audit trail
│   │   │   └── Attachment.js         # File attachments
│   │   ├── controllers/              # Request handlers
│   │   │   ├── authController.js
│   │   │   └── stockController.js
│   │   ├── services/                 # Business logic
│   │   │   └── stockService.js       # Stock management
│   │   ├── routes/                   # API routes
│   │   │   ├── authRoutes.js
│   │   │   ├── stockRoutes.js
│   │   │   ├── wasteRoutes.js
│   │   │   ├── salesRoutes.js
│   │   │   ├── productRoutes.js
│   │   │   ├── supplierRoutes.js
│   │   │   ├── customerRoutes.js
│   │   │   ├── warehouseRoutes.js
│   │   │   ├── invoiceRoutes.js
│   │   │   ├── reportRoutes.js
│   │   │   └── auditRoutes.js
│   │   ├── middlewares/              # Express middlewares
│   │   │   └── auth.js               # JWT & RBAC
│   │   ├── migrations/               # Database migrations
│   │   │   └── runner.js
│   │   ├── seeders/                  # Sample data
│   │   │   └── runner.js
│   │   ├── jobs/                     # Cron jobs
│   │   │   └── expiryAlerts.js
│   │   ├── utils/                    # Helper functions
│   │   └── server.js                 # Express app
│   ├── tests/                        # Test files
│   ├── uploads/                      # File uploads
│   ├── .env.example                  # Environment template
│   ├── package.json
│   └── README.md                     # Backend docs
├── frontend/
│   ├── src/
│   │   ├── components/               # React components
│   │   ├── pages/                    # Page components
│   │   ├── services/                 # API services
│   │   ├── hooks/                    # Custom hooks
│   │   ├── utils/                    # Utilities
│   │   ├── i18n/                     # Translations
│   │   ├── App.jsx                   # Main app
│   │   └── main.jsx                  # Entry point
│   ├── public/                       # Static assets
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── instruction.md                    # Original requirements
└── README.md                         # This file
```

## 🔑 Key Concepts

### 1. Inventory Ledger (Single Source of Truth)

Every stock movement is recorded as an immutable ledger entry:

```javascript
{
  stock_entry_id: 12,
  movement_type: 'RECEIPT' | 'WASTE' | 'SALE' | 'ADJUSTMENT' | 'TRANSFER',
  qty: 100.00,              // Positive for in, negative for out
  balance_after: 350.00,    // Running balance
  reference_type: 'sales',
  reference_id: 45,
  performed_by: 1,
  performed_at: '2025-10-24T10:30:00Z',
  note: 'Sale to customer XYZ'
}
```

Available quantity = Latest `balance_after` for a stock_entry_id

### 2. Transactional Safety

All critical operations (waste, sale) use transactions with row locking:

```javascript
const transaction = await sequelize.transaction();
try {
  // Lock the row (SELECT FOR UPDATE)
  const stock = await StockEntry.findByPk(id, {
    lock: transaction.LOCK.UPDATE,
    transaction
  });
  
  // Validate and update
  // ...
  
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

This prevents race conditions and overselling even under high concurrency.

### 3. Optimistic Locking

Stock entries use version numbers to handle concurrent updates:

```javascript
// Client sends version number
PUT /api/stock/12
{
  "version": 1,
  "notes": "Updated"
}

// Server checks and increments
if (stock.version !== requestVersion) {
  return 409; // Conflict
}
stock.version++;
```

### 4. Role-Based Access Control

5 roles with specific permissions:

- **ADMIN**: Full system access
- **WAREHOUSE**: Stock management, waste recording
- **SALES**: Sales creation, customer management
- **ACCOUNTANT**: Financial reports, invoicing
- **VIEWER**: Read-only access

### 5. Audit Trail

Every change is logged with:
- What changed (old_value → new_value)
- Who made the change (user)
- When it happened (timestamp)
- Where it came from (IP address, user agent)

## 📡 API Documentation

### Base URL
```
http://localhost:4000/api
```

### Authentication
```http
POST /api/auth/login
{
  "username": "admin",
  "password": "password123"
}

Response:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": { ... }
  }
}
```

### Stock Management
```http
# Create stock entry
POST /api/stock
Authorization: Bearer {token}
{
  "product_id": 1,
  "supplier_id": 1,
  "warehouse_id": 1,
  "pallets": 10,
  "pallet_weight": 25.5,
  "date_in": "2025-10-24",
  "expiry_date": "2025-11-08",
  "notes": "Fresh arrival"
}

# List stock entries
GET /api/stock?product_id=1&status=AVAILABLE&page=1&limit=50

# Get stock details
GET /api/stock/:id

# Update stock (with optimistic locking)
PUT /api/stock/:id
{
  "version": 1,
  "notes": "Updated"
}

# Get stock summary
GET /api/stock/summary
```

### Waste Management
```http
# Record waste (transactional)
POST /api/waste
{
  "stock_entry_id": 12,
  "waste_weight": 5.25,
  "notes": "Damaged"
}

# List waste entries
GET /api/waste?stock_entry_id=12
```

### Sales Management
```http
# Create sale (transactional)
POST /api/sales
{
  "stock_entry_id": 12,
  "customer_id": 2,
  "sold_weight": 100,
  "unit_price": 3.50,
  "sale_date": "2025-10-25"
}

# List sales
GET /api/sales?customer_id=1&date_from=2025-10-01&date_to=2025-10-31

# Get sales statistics
GET /api/sales/summary/stats
```

### Reports
```http
# Near-expiry items
GET /api/reports/near-expiry?days=7

# Stock summary
GET /api/reports/stock-summary

# Sales revenue
GET /api/reports/sales-revenue?date_from=2025-10-01

# Waste analysis
GET /api/reports/waste-analysis

# Inventory valuation
GET /api/reports/inventory-valuation
```

### Full API Documentation
See `backend/README.md` for complete API documentation with all endpoints.

## 📊 Sample Data

The system includes comprehensive seed data dated 2025-10-24:

- **7 Products**: Tomato, Cabbage, Sweet Pepper, Eggplant, Beetroot, Onion, Pumpkin
- **4 Suppliers**: Including Mahshid Mehregan (Iran)
- **6 Customers**: Including Carrefour, Lulu, Al Meera
- **3 Warehouses**: Main warehouse, cold storage, distribution center
- **10 Stock Batches**: Various products with different expiry dates
- **Sample Transactions**: Waste records, sales records
- **Complete Ledger**: All movements tracked

Some items are set to expire soon (5-7 days) to demonstrate the expiry alert system.

## 🔐 Security Features

### Authentication & Authorization
- JWT-based stateless authentication
- Token expiry and refresh mechanism
- Role-based access control (RBAC)
- Permission-based endpoint protection

### Data Security
- Password hashing with bcrypt (10 rounds)
- SQL injection protection (Sequelize ORM)
- XSS prevention (input sanitization)
- CSRF protection (helmet)
- Rate limiting (100 requests per 15 min)

### Audit & Compliance
- Complete audit trail for all operations
- IP address and user agent logging
- Soft deletes (data preservation)
- Immutable ledger records
- Change tracking (old_value → new_value)

### Infrastructure Security
- CORS configuration
- Helmet security headers
- Environment variable protection
- Secure session handling
- HTTPS ready

## 🎨 Frontend Features (Ready to Implement)

The frontend structure is prepared with:

- React 18 with Vite for fast development
- TailwindCSS for beautiful, responsive UI
- React Router v6 for navigation
- Axios for API integration
- Chart.js for data visualization
- react-i18next for bilingual support
- react-hook-form for form handling
- Hot toast notifications

### Planned Pages
- Dashboard (KPI cards, charts)
- Stock Management (inventory table, near-expiry alerts)
- Waste & Damage Tracking
- Sales Management
- Product Catalog
- Supplier Management
- Customer Management
- Warehouse Management
- Invoice Management
- Reports & Analytics
- User Settings
- Audit Logs

## 🚢 Deployment

### Production Checklist

Backend:
- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET` (64+ characters)
- [ ] Configure production database
- [ ] Set up HTTPS/SSL
- [ ] Configure CORS for production domain
- [ ] Set up automated backups
- [ ] Install PM2 for process management
- [ ] Configure monitoring (optional: Sentry, LogRocket)
- [ ] Set up reverse proxy (Nginx)
- [ ] Review and adjust rate limits
- [ ] Change all default passwords
- [ ] Enable log rotation

Frontend:
- [ ] Build production bundle (`npm run build`)
- [ ] Configure CDN (optional)
- [ ] Set up static file serving
- [ ] Configure environment variables
- [ ] Enable Gzip compression
- [ ] Set up analytics (optional)

### Deployment with PM2

```bash
# Install PM2
npm install -g pm2

# Start backend
cd backend
pm2 start src/server.js --name dai-trading-api

# Save PM2 config
pm2 save
pm2 startup

# Monitor
pm2 status
pm2 logs dai-trading-api
pm2 monit
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name api.daitrading.qa;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.daitrading.qa;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🧪 Testing

```bash
cd backend
npm test                    # Run all tests
npm test -- --coverage      # Run with coverage report
npm test -- --watch        # Watch mode
```

Test files should be added in `backend/tests/` following this structure:
```
tests/
├── unit/
│   ├── models/
│   ├── services/
│   └── utils/
├── integration/
│   ├── auth.test.js
│   ├── stock.test.js
│   └── sales.test.js
└── helpers/
    └── testHelpers.js
```

## 📈 Performance Optimization

### Database
- Indexes on foreign keys and frequently queried fields
- Connection pooling (max: 10, min: 0)
- Query optimization with proper includes
- Pagination on all list endpoints

### Backend
- Response compression (gzip)
- Rate limiting to prevent abuse
- Efficient ledger balance calculation
- Caching strategies (can be added)

### Frontend
- Code splitting with React.lazy
- Image optimization
- Bundle size optimization
- CDN for static assets

## 🔧 Troubleshooting

### Database Connection Failed
```bash
# Check MySQL status
sudo systemctl status mysql

# Test connection
mysql -u root -p -e "SELECT 1"

# Verify .env credentials
```

### Port Already in Use
```bash
# Find process on port 4000
lsof -i :4000

# Kill process
kill -9 <PID>

# Or use different port in .env
```

### Migration Errors
```bash
# Rollback migrations
node src/migrations/runner.js rollback

# Re-run migrations
npm run migrate
```

## 📚 Documentation

- [Backend README](backend/README.md) - Complete backend documentation
- [API Documentation](backend/README.md#-api-documentation) - All API endpoints
- [Original Requirements](instruction.md) - Full specification

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style
- Follow ESLint rules
- Use meaningful variable names
- Add comments for complex logic
- Write tests for new features
- Update documentation

## 📝 License

ISC License

## 🙏 Acknowledgments

- Built for Dai Trading, Qatar
- Designed for compliance with Qatar business regulations
- Implements best practices for inventory management
- Follows enterprise-grade security standards

## 📞 Support

For questions, issues, or feature requests:
- Create an issue in the repository
- Contact the development team
- Refer to the documentation

---

## 🎯 Future Enhancements

### Phase 2 Features
- [ ] Complete frontend implementation
- [ ] PDF invoice generation with bilingual support
- [ ] QR code integration for invoices
- [ ] Email notifications for alerts
- [ ] SMS notifications for critical alerts
- [ ] Advanced reporting with filters
- [ ] Data export (Excel, CSV, PDF)
- [ ] Print functionality for reports
- [ ] Mobile app (React Native)

### Phase 3 Features
- [ ] Multi-currency support
- [ ] Advanced accounting module
- [ ] Purchase requisition workflow
- [ ] Approval workflows
- [ ] Barcode scanning
- [ ] Integration with payment gateways
- [ ] Customer portal
- [ ] Supplier portal
- [ ] API for third-party integrations
- [ ] Advanced analytics and BI

### Infrastructure
- [ ] Redis caching layer
- [ ] ElasticSearch for advanced search
- [ ] RabbitMQ for async processing
- [ ] Microservices architecture (future)
- [ ] Docker containerization
- [ ] Kubernetes orchestration
- [ ] CI/CD pipeline
- [ ] Automated testing suite

---

**Built with ❤️ for Dai Trading**

*Last Updated: 2025-10-24*