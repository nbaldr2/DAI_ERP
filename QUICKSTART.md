# 🚀 Quick Start Guide - Dai Trading ERP

Get up and running in **10 minutes**!

---

## 📋 Prerequisites

Before you begin, ensure you have:

- ✅ Node.js 18+ installed
- ✅ MySQL 8+ installed and running
- ✅ Git installed

Check versions:
```bash
node --version    # Should be v18 or higher
npm --version
mysql --version   # Should be 8.0 or higher
```

---

## ⚡ Setup (10 Minutes)

### Step 1: Clone & Install (2 min)

```bash
# Navigate to the project
cd dai-trading2/backend

# Install dependencies
npm install
```

### Step 2: Configure Environment (1 min)

```bash
# Copy environment template
cp .env.example .env

# Edit .env file
nano .env  # or use your favorite editor
```

**Minimum required changes in `.env`:**
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=daifresh
DB_USER=root
DB_PASS=your_mysql_password  # ⚠️ CHANGE THIS
JWT_SECRET=your_secret_key    # ⚠️ CHANGE THIS
```

💡 **Tip**: Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Create Database (1 min)

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE daifresh CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Verify
SHOW DATABASES;

# Exit
EXIT;
```

### Step 4: Run Migrations (2 min)

```bash
# Run all database migrations
npm run migrate

# You should see:
# ✅ Migration 001_create_users_table completed
# ✅ Migration 002_create_warehouses_table completed
# ... (13 migrations total)
# 🎉 All migrations completed successfully!
```

### Step 5: Seed Sample Data (2 min)

```bash
# Load sample data (dated 2025-10-24)
npm run seed

# You should see:
# ✅ Created 5 users
# ✅ Created 3 warehouses
# ✅ Created 4 suppliers
# ✅ Created 6 customers
# ✅ Created 7 products
# ✅ Created 10 stock entries
# 🎉 Database seeding completed successfully!
```

### Step 6: Start the Server (1 min)

```bash
# Start in development mode
npm run dev

# You should see:
# ✅ Database connection established successfully.
# 📡 Server running on port: 4000
# 🌍 Environment: development
```

**🎉 Backend is now running on http://localhost:4000**

---

## 🧪 Test the API (1 min)

### Test 1: Health Check

```bash
curl http://localhost:4000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Dai Trading ERP API is running",
  "timestamp": "2025-10-24T10:00:00.000Z",
  "environment": "development"
}
```

### Test 2: Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123"
  }'
```

Expected response:
```json
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

**💾 Save the token** - you'll need it for other API calls!

### Test 3: Get Stock Summary (Protected Route)

```bash
# Replace YOUR_TOKEN with the token from login response
curl http://localhost:4000/api/reports/stock-summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "total_stock_kg": "2700.00",
    "total_waste_kg": "15.50",
    "total_sold_kg": "650.00",
    "total_available_kg": "2034.50",
    "timestamp": "2025-10-24T10:00:00.000Z"
  }
}
```

### Test 4: Get Near-Expiry Items

```bash
curl http://localhost:4000/api/reports/near-expiry?days=7 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 👥 Default User Accounts

After seeding, you have these test accounts:

| Username | Password | Role | Use Case |
|----------|----------|------|----------|
| admin | password123 | ADMIN | Full system access |
| warehouse_manager | password123 | WAREHOUSE | Stock & warehouse operations |
| sales_manager | password123 | SALES | Sales & customer management |
| accountant | password123 | ACCOUNTANT | Financial reports & invoicing |
| viewer | password123 | VIEWER | Read-only access |

**⚠️ SECURITY WARNING**: Change all default passwords before deploying to production!

---

## 📊 Sample Data Overview

The seed data (dated 2025-10-24) includes:

### Products
- 🍅 Tomato (طماطم)
- 🥬 Cabbage (كرنب)
- 🫑 Sweet Pepper (فلفل حلو)
- 🍆 Eggplant (باذنجان)
- 🥕 Beetroot (شمندر)
- 🧅 Onion (بصل)
- 🎃 Pumpkin (يقطين)

### Suppliers
- Mahshid Mehregan (Iran) - Primary supplier
- Fresh Farms International (Netherlands)
- Mediterranean Produce Co. (Spain)
- Emirates Fresh Exports (UAE)

### Customers
- Carrefour Qatar (Wholesale)
- Lulu Hypermarket (Wholesale)
- Monoprix Qatar (Wholesale)
- Al Meera Supermarkets (Wholesale)
- Fresh Corner Market (Retail)
- Green Valley Restaurant (Retail)

### Stock Entries
- 10 batches across 3 warehouses
- Various expiry dates (some near expiry!)
- Realistic pallet counts and weights
- Complete ledger entries

### Sample Transactions
- 1 waste entry (damaged goods)
- 3 sales transactions
- Complete inventory ledger updates

---

## 🔥 Common Operations

### Create New Stock Entry

```bash
curl -X POST http://localhost:4000/api/stock \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "supplier_id": 1,
    "warehouse_id": 1,
    "pallets": 15,
    "pallet_weight": 25.5,
    "date_in": "2025-10-25",
    "expiry_date": "2025-11-15",
    "notes": "Fresh delivery"
  }'
```

### Record Waste

```bash
curl -X POST http://localhost:4000/api/waste \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stock_entry_id": 1,
    "waste_weight": 5.5,
    "notes": "Damaged during transport"
  }'
```

### Create Sale

```bash
curl -X POST http://localhost:4000/api/sales \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stock_entry_id": 1,
    "customer_id": 1,
    "sold_weight": 100,
    "unit_price": 3.50,
    "sale_date": "2025-10-25",
    "notes": "Regular order"
  }'
```

### List Products

```bash
curl http://localhost:4000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Audit Trail

```bash
curl http://localhost:4000/api/audit-logs/entity/stock_entry/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎯 What to Try Next

1. **Explore the API**: Check `backend/README.md` for full API documentation
2. **Test Different Roles**: Login with different users to see permission differences
3. **View Reports**: Try all 5 report endpoints
4. **Check Audit Logs**: See complete change history
5. **Test Transactions**: Try creating waste/sales and watch ledger updates
6. **Monitor Expiry**: Check near-expiry items endpoint

---

## 🚨 Troubleshooting

### "Database connection failed"

```bash
# Check MySQL is running
sudo systemctl status mysql  # Linux
brew services list           # macOS

# Test connection
mysql -u root -p -e "SELECT 1"

# Verify credentials in .env
cat .env | grep DB_
```

### "Port 4000 already in use"

```bash
# Find process using port 4000
lsof -i :4000

# Kill the process
kill -9 <PID>

# Or change port in .env
PORT=4001
```

### "Migration failed"

```bash
# Drop and recreate database
mysql -u root -p -e "DROP DATABASE daifresh; CREATE DATABASE daifresh;"

# Run migrations again
npm run migrate
```

### "Seeder failed"

```bash
# Clear and re-seed
mysql -u root -p -e "DROP DATABASE daifresh; CREATE DATABASE daifresh;"
npm run migrate
npm run seed
```

### "Token expired" or "Invalid token"

```bash
# Login again to get a new token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

---

## 📚 Next Steps

### Learn More
- 📖 Read the [complete README](README.md)
- 📖 Read the [backend documentation](backend/README.md)
- 📖 Review the [API documentation](backend/README.md#-api-documentation)
- 📖 Check the [project summary](PROJECT_SUMMARY.md)

### Development
- 🔧 Set up the frontend (React + Vite)
- 🧪 Write tests (Jest + Supertest)
- 🚀 Deploy to production (see deployment guide)
- 📊 Implement additional features

### Production Deployment
- 🔐 Change all default passwords
- 🔑 Generate strong JWT secret
- 🗄️ Set up database backups
- 🔒 Enable HTTPS
- 📈 Set up monitoring
- 🚀 Use PM2 for process management

---

## 💡 Pro Tips

1. **Use Postman**: Import the API endpoints for easier testing
2. **Watch Logs**: Keep `npm run dev` running to see all operations
3. **Check Audit Logs**: Every operation is logged for compliance
4. **Test Transactions**: Try creating waste/sales with insufficient stock to see validation
5. **Explore Ledger**: Check how inventory ledger tracks all movements
6. **Test Concurrency**: Try updating the same stock entry with different versions

---

## 🎊 You're All Set!

Your Dai Trading ERP backend is now running with:

✅ Complete database with sample data
✅ 60+ API endpoints ready to use
✅ 5 user accounts with different roles
✅ Transactional safety with row locking
✅ Complete audit trail
✅ Automated expiry alerts
✅ Comprehensive reporting

**Start building your frontend or integrate with existing systems!**

---

## 🆘 Need Help?

- 📖 Check [README.md](README.md) for comprehensive documentation
- 🐛 Review [Troubleshooting Guide](backend/README.md#-troubleshooting)
- 💬 Check code comments for implementation details
- 📧 Contact the development team

---

**Happy Coding! 🚀**

*Last Updated: 2025-10-24*