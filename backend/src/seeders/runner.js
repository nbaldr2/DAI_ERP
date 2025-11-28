const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const {
  User,
  Warehouse,
  Supplier,
  Customer,
  Product,
  StockEntry,
  InventoryLedger,
  WasteDamage,
  Sale
} = require('../models');

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.\n');

    // Clear existing data (in correct order due to foreign keys)
    console.log('🧹 Clearing existing data...');
    await Sale.destroy({ where: {}, force: true });
    await WasteDamage.destroy({ where: {}, force: true });
    await InventoryLedger.destroy({ where: {}, force: true });
    await StockEntry.destroy({ where: {}, force: true });
    await Product.destroy({ where: {}, force: true });
    await Customer.destroy({ where: {}, force: true });
    await Supplier.destroy({ where: {}, force: true });
    await Warehouse.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    console.log('✅ Existing data cleared.\n');

    // 1. Seed Users
    console.log('👤 Seeding users...');
    const passwordHash = await bcrypt.hash('password123', 10);

    const users = await User.bulkCreate([
      {
        username: 'admin',
        password_hash: passwordHash,
        name: 'System Administrator',
        role: 'ADMIN'
      },
      {
        username: 'warehouse_manager',
        password_hash: passwordHash,
        name: 'Ahmed Al-Kuwari',
        role: 'WAREHOUSE'
      },
      {
        username: 'sales_manager',
        password_hash: passwordHash,
        name: 'Fatima Al-Thani',
        role: 'SALES'
      },
      {
        username: 'accountant',
        password_hash: passwordHash,
        name: 'Mohammed Hassan',
        role: 'ACCOUNTANT'
      },
      {
        username: 'viewer',
        password_hash: passwordHash,
        name: 'Guest User',
        role: 'VIEWER'
      }
    ]);
    console.log(`✅ Created ${users.length} users.\n`);

    // 2. Seed Warehouses
    console.log('🏭 Seeding warehouses...');
    const warehouses = await Warehouse.bulkCreate([
      {
        name: 'Main Warehouse - Doha',
        location: 'Industrial Area, Doha, Qatar'
      },
      {
        name: 'Cold Storage Facility',
        location: 'Al Wakrah, Qatar'
      },
      {
        name: 'Distribution Center',
        location: 'Ras Laffan Industrial City, Qatar'
      }
    ]);
    console.log(`✅ Created ${warehouses.length} warehouses.\n`);

    // 3. Seed Suppliers
    console.log('🚚 Seeding suppliers...');
    const suppliers = await Supplier.bulkCreate([
      {
        name: 'Mahshid Mehregan',
        contact_person: 'Mr. Reza Mehregan',
        phone: '+98-21-12345678',
        email: 'info@mahshidmehregan.ir',
        address: 'Tehran Agricultural Complex, Unit 15',
        country: 'Iran'
      },
      {
        name: 'Fresh Farms International',
        contact_person: 'Mrs. Sarah Johnson',
        phone: '+31-20-7654321',
        email: 'sales@freshfarms.nl',
        address: 'Rotterdam Port Area, Building 42',
        country: 'Netherlands'
      },
      {
        name: 'Mediterranean Produce Co.',
        contact_person: 'Mr. Carlos Rodriguez',
        phone: '+34-91-8765432',
        email: 'export@medproduce.es',
        address: 'Valencia Export Zone, Warehouse 7',
        country: 'Spain'
      },
      {
        name: 'Emirates Fresh Exports',
        contact_person: 'Mr. Khalid Al-Mansouri',
        phone: '+971-4-3456789',
        email: 'orders@emiratesfresh.ae',
        address: 'Dubai Industrial Park, Gate 3',
        country: 'UAE'
      }
    ]);
    console.log(`✅ Created ${suppliers.length} suppliers.\n`);

    // 4. Seed Customers
    console.log('👥 Seeding customers...');
    const customers = await Customer.bulkCreate([
      {
        name: 'Carrefour Qatar',
        contact: '+974-4444-5555',
        address: 'Multiple Locations, Doha',
        type: 'WHOLESALE',
        credit_limit: 50000.00
      },
      {
        name: 'Lulu Hypermarket',
        contact: '+974-4444-6666',
        address: 'Al Gharafa, Doha',
        type: 'WHOLESALE',
        credit_limit: 75000.00
      },
      {
        name: 'Monoprix Qatar',
        contact: '+974-4444-7777',
        address: 'The Pearl, Doha',
        type: 'WHOLESALE',
        credit_limit: 30000.00
      },
      {
        name: 'Al Meera Supermarkets',
        contact: '+974-4444-8888',
        address: 'Various Locations',
        type: 'WHOLESALE',
        credit_limit: 60000.00
      },
      {
        name: 'Fresh Corner Market',
        contact: '+974-5555-1234',
        address: 'Bin Mahmoud, Doha',
        type: 'RETAIL',
        credit_limit: 5000.00
      },
      {
        name: 'Green Valley Restaurant',
        contact: '+974-5555-5678',
        address: 'West Bay, Doha',
        type: 'RETAIL',
        credit_limit: 10000.00
      }
    ]);
    console.log(`✅ Created ${customers.length} customers.\n`);

    // 5. Seed Products
    console.log('🥬 Seeding products...');
    const products = await Product.bulkCreate([
      {
        name_en: 'Tomato',
        name_ar: 'طماطم',
        category: 'Vegetables',
        origin: 'Iran',
        unit: 'kg',
        min_qty: 100,
        expiry_alert_days: 5,
        price_per_unit: 3.50
      },
      {
        name_en: 'Cabbage',
        name_ar: 'كرنب',
        category: 'Vegetables',
        origin: 'Iran',
        unit: 'kg',
        min_qty: 150,
        expiry_alert_days: 7,
        price_per_unit: 2.80
      },
      {
        name_en: 'Sweet Pepper',
        name_ar: 'فلفل حلو',
        category: 'Vegetables',
        origin: 'Iran',
        unit: 'kg',
        min_qty: 80,
        expiry_alert_days: 5,
        price_per_unit: 5.20
      },
      {
        name_en: 'Eggplant',
        name_ar: 'باذنجان',
        category: 'Vegetables',
        origin: 'Iran',
        unit: 'kg',
        min_qty: 100,
        expiry_alert_days: 6,
        price_per_unit: 4.00
      },
      {
        name_en: 'Beetroot',
        name_ar: 'شمندر',
        category: 'Vegetables',
        origin: 'Netherlands',
        unit: 'kg',
        min_qty: 120,
        expiry_alert_days: 10,
        price_per_unit: 3.20
      },
      {
        name_en: 'Onion',
        name_ar: 'بصل',
        category: 'Vegetables',
        origin: 'Iran',
        unit: 'kg',
        min_qty: 200,
        expiry_alert_days: 15,
        price_per_unit: 2.50
      },
      {
        name_en: 'Pumpkin',
        name_ar: 'يقطين',
        category: 'Vegetables',
        origin: 'Spain',
        unit: 'kg',
        min_qty: 150,
        expiry_alert_days: 12,
        price_per_unit: 3.80
      }
    ]);
    console.log(`✅ Created ${products.length} products.\n`);

    // 6. Seed Stock Entries (dated 2025-10-24)
    console.log('📦 Seeding stock entries for 2025-10-24...');

    const stockEntries = await StockEntry.bulkCreate([
      {
        product_id: products[0].id, // Tomato
        supplier_id: suppliers[0].id, // Mahshid Mehregan
        warehouse_id: warehouses[0].id,
        pallets: 15,
        pallet_weight: 25.5,
        total_weight: 382.5,
        date_in: '2025-10-24',
        expiry_date: '2025-11-03', // 10 days - will be near expiry in 3 days
        status: 'RECEIVED',
        notes: 'Arrival from Mahshid Mehregan - Fresh harvest, Grade A quality'
      },
      {
        product_id: products[1].id, // Cabbage
        supplier_id: suppliers[0].id,
        warehouse_id: warehouses[0].id,
        pallets: 20,
        pallet_weight: 22.0,
        total_weight: 440.0,
        date_in: '2025-10-24',
        expiry_date: '2025-11-08', // 15 days
        status: 'RECEIVED',
        notes: 'Excellent quality cabbages, well-packed'
      },
      {
        product_id: products[2].id, // Sweet Pepper
        supplier_id: suppliers[0].id,
        warehouse_id: warehouses[1].id, // Cold Storage
        pallets: 12,
        pallet_weight: 18.5,
        total_weight: 222.0,
        date_in: '2025-10-24',
        expiry_date: '2025-10-30', // 6 days - NEAR EXPIRY
        status: 'RECEIVED',
        notes: 'Mixed colors: red, yellow, green. Requires cold storage.'
      },
      {
        product_id: products[3].id, // Eggplant
        supplier_id: suppliers[0].id,
        warehouse_id: warehouses[0].id,
        pallets: 18,
        pallet_weight: 20.0,
        total_weight: 360.0,
        date_in: '2025-10-24',
        expiry_date: '2025-11-05', // 12 days
        status: 'RECEIVED',
        notes: 'Black variety, fresh from Iran'
      },
      {
        product_id: products[4].id, // Beetroot
        supplier_id: suppliers[1].id, // Fresh Farms International
        warehouse_id: warehouses[0].id,
        pallets: 16,
        pallet_weight: 24.0,
        total_weight: 384.0,
        date_in: '2025-10-24',
        expiry_date: '2025-11-15', // 22 days
        status: 'RECEIVED',
        notes: 'Imported from Netherlands, organic certified'
      },
      {
        product_id: products[5].id, // Onion
        supplier_id: suppliers[0].id,
        warehouse_id: warehouses[0].id,
        pallets: 25,
        pallet_weight: 30.0,
        total_weight: 750.0,
        date_in: '2025-10-24',
        expiry_date: '2025-12-08', // 45 days
        status: 'RECEIVED',
        notes: 'Yellow onions, large size, excellent storage quality'
      },
      {
        product_id: products[6].id, // Pumpkin
        supplier_id: suppliers[2].id, // Mediterranean Produce
        warehouse_id: warehouses[0].id,
        pallets: 14,
        pallet_weight: 28.0,
        total_weight: 392.0,
        date_in: '2025-10-24',
        expiry_date: '2025-11-20', // 27 days
        status: 'RECEIVED',
        notes: 'Spanish pumpkins, ideal for soups and desserts'
      },
      {
        product_id: products[0].id, // Tomato (second batch)
        supplier_id: suppliers[3].id, // Emirates Fresh
        warehouse_id: warehouses[1].id,
        pallets: 10,
        pallet_weight: 24.0,
        total_weight: 240.0,
        date_in: '2025-10-24',
        expiry_date: '2025-10-29', // 5 days - VERY NEAR EXPIRY
        status: 'RECEIVED',
        notes: 'Cherry tomatoes from UAE, premium quality'
      },
      {
        product_id: products[2].id, // Sweet Pepper (second batch)
        supplier_id: suppliers[3].id,
        warehouse_id: warehouses[1].id,
        pallets: 8,
        pallet_weight: 19.0,
        total_weight: 152.0,
        date_in: '2025-10-24',
        expiry_date: '2025-11-10', // 17 days
        status: 'RECEIVED',
        notes: 'Red bell peppers, large size'
      },
      {
        product_id: products[1].id, // Cabbage (quarantine batch)
        supplier_id: suppliers[0].id,
        warehouse_id: warehouses[0].id,
        pallets: 5,
        pallet_weight: 22.0,
        total_weight: 110.0,
        date_in: '2025-10-24',
        expiry_date: '2025-11-07',
        status: 'PENDING',
        notes: 'Under inspection - quality check pending'
      }
    ]);
    console.log(`✅ Created ${stockEntries.length} stock entries.\n`);

    // 7. Seed Initial Inventory Ledger Entries (RECEIPT)
    console.log('📊 Creating initial inventory ledger entries...');
    const adminUser = users[0];

    for (const stock of stockEntries) {
      await InventoryLedger.create({
        stock_entry_id: stock.id,
        movement_type: 'RECEIPT',
        qty: stock.total_weight,
        reference_type: 'stock_entry',
        reference_id: stock.id,
        balance_after: stock.total_weight,
        performed_by: adminUser.id,
        note: `Initial receipt - ${stock.notes || 'Stock received'}`
      });
    }
    console.log(`✅ Created ${stockEntries.length} initial ledger entries.\n`);

    // 8. Create Sample Waste Entry
    console.log('🗑️ Creating sample waste entry...');
    const warehouseManager = users[1];
    const wasteStock = stockEntries[2]; // Sweet Pepper batch

    const transaction1 = await sequelize.transaction();
    try {
      // Lock the stock entry
      const lockedStock = await StockEntry.findByPk(wasteStock.id, {
        lock: transaction1.LOCK.UPDATE,
        transaction: transaction1
      });

      // Get current balance
      const currentBalance = await InventoryLedger.getLatestBalance(wasteStock.id, transaction1);
      const wasteWeight = 15.5;

      if (wasteWeight > currentBalance) {
        throw new Error('Insufficient stock for waste operation');
      }

      // Create waste record
      const wasteRecord = await WasteDamage.create({
        stock_entry_id: wasteStock.id,
        waste_weight: wasteWeight,
        notes: 'Damaged during unloading - crushed boxes on bottom layer',
        created_by: warehouseManager.id
      }, { transaction: transaction1 });

      // Create ledger entry
      await InventoryLedger.create({
        stock_entry_id: wasteStock.id,
        movement_type: 'WASTE',
        qty: -wasteWeight,
        reference_type: 'waste_damage',
        reference_id: wasteRecord.id,
        balance_after: currentBalance - wasteWeight,
        performed_by: warehouseManager.id,
        note: 'Waste recorded - damaged goods'
      }, { transaction: transaction1 });

      await transaction1.commit();
      console.log(`✅ Created waste entry: ${wasteWeight}kg from stock #${wasteStock.id}\n`);
    } catch (error) {
      await transaction1.rollback();
      console.error('❌ Waste entry failed:', error.message);
    }

    // 9. Create Sample Sale Entries
    console.log('💰 Creating sample sale entries...');
    const salesManager = users[2];

    // Sale 1: Tomatoes to Carrefour
    const transaction2 = await sequelize.transaction();
    try {
      const saleStock1 = stockEntries[0]; // Tomato batch
      const lockedStock1 = await StockEntry.findByPk(saleStock1.id, {
        lock: transaction2.LOCK.UPDATE,
        transaction: transaction2
      });

      const currentBalance1 = await InventoryLedger.getLatestBalance(saleStock1.id, transaction2);
      const soldWeight1 = 150.0;

      if (soldWeight1 > currentBalance1) {
        throw new Error('Insufficient stock for sale');
      }

      // Create sale record
      const saleRecord1 = await Sale.create({
        stock_entry_id: saleStock1.id,
        customer_id: customers[0].id, // Carrefour
        sold_weight: soldWeight1,
        unit_price: products[0].price_per_unit,
        total_amount: soldWeight1 * products[0].price_per_unit,
        sale_date: '2025-10-25',
        notes: 'Bulk order for weekend promotion',
        created_by: salesManager.id
      }, { transaction: transaction2 });

      // Create ledger entry
      await InventoryLedger.create({
        stock_entry_id: saleStock1.id,
        movement_type: 'SALE',
        qty: -soldWeight1,
        reference_type: 'sales',
        reference_id: saleRecord1.id,
        balance_after: currentBalance1 - soldWeight1,
        performed_by: salesManager.id,
        note: `Sale to ${customers[0].name}`
      }, { transaction: transaction2 });

      await transaction2.commit();
      console.log(`✅ Created sale: ${soldWeight1}kg of Tomatoes to Carrefour\n`);
    } catch (error) {
      await transaction2.rollback();
      console.error('❌ Sale 1 failed:', error.message);
    }

    // Sale 2: Cabbage to Lulu Hypermarket
    const transaction3 = await sequelize.transaction();
    try {
      const saleStock2 = stockEntries[1]; // Cabbage batch
      const lockedStock2 = await StockEntry.findByPk(saleStock2.id, {
        lock: transaction3.LOCK.UPDATE,
        transaction: transaction3
      });

      const currentBalance2 = await InventoryLedger.getLatestBalance(saleStock2.id, transaction3);
      const soldWeight2 = 200.0;

      if (soldWeight2 > currentBalance2) {
        throw new Error('Insufficient stock for sale');
      }

      const saleRecord2 = await Sale.create({
        stock_entry_id: saleStock2.id,
        customer_id: customers[1].id, // Lulu
        sold_weight: soldWeight2,
        unit_price: products[1].price_per_unit,
        total_amount: soldWeight2 * products[1].price_per_unit,
        sale_date: '2025-10-25',
        notes: 'Regular weekly order',
        created_by: salesManager.id
      }, { transaction: transaction3 });

      await InventoryLedger.create({
        stock_entry_id: saleStock2.id,
        movement_type: 'SALE',
        qty: -soldWeight2,
        reference_type: 'sales',
        reference_id: saleRecord2.id,
        balance_after: currentBalance2 - soldWeight2,
        performed_by: salesManager.id,
        note: `Sale to ${customers[1].name}`
      }, { transaction: transaction3 });

      await transaction3.commit();
      console.log(`✅ Created sale: ${soldWeight2}kg of Cabbage to Lulu Hypermarket\n`);
    } catch (error) {
      await transaction3.rollback();
      console.error('❌ Sale 2 failed:', error.message);
    }

    // Sale 3: Onions to Al Meera
    const transaction4 = await sequelize.transaction();
    try {
      const saleStock3 = stockEntries[5]; // Onion batch
      const lockedStock3 = await StockEntry.findByPk(saleStock3.id, {
        lock: transaction4.LOCK.UPDATE,
        transaction: transaction4
      });

      const currentBalance3 = await InventoryLedger.getLatestBalance(saleStock3.id, transaction4);
      const soldWeight3 = 300.0;

      if (soldWeight3 > currentBalance3) {
        throw new Error('Insufficient stock for sale');
      }

      const saleRecord3 = await Sale.create({
        stock_entry_id: saleStock3.id,
        customer_id: customers[3].id, // Al Meera
        sold_weight: soldWeight3,
        unit_price: products[5].price_per_unit,
        total_amount: soldWeight3 * products[5].price_per_unit,
        sale_date: '2025-10-26',
        notes: 'Large order for multiple branches',
        created_by: salesManager.id
      }, { transaction: transaction4 });

      await InventoryLedger.create({
        stock_entry_id: saleStock3.id,
        movement_type: 'SALE',
        qty: -soldWeight3,
        reference_type: 'sales',
        reference_id: saleRecord3.id,
        balance_after: currentBalance3 - soldWeight3,
        performed_by: salesManager.id,
        note: `Sale to ${customers[3].name}`
      }, { transaction: transaction4 });

      await transaction4.commit();
      console.log(`✅ Created sale: ${soldWeight3}kg of Onions to Al Meera\n`);
    } catch (error) {
      await transaction4.rollback();
      console.error('❌ Sale 3 failed:', error.message);
    }

    console.log('🎉 Database seeding completed successfully!\n');
    console.log('📝 Summary:');
    console.log(`   - ${users.length} users created`);
    console.log(`   - ${warehouses.length} warehouses created`);
    console.log(`   - ${suppliers.length} suppliers created`);
    console.log(`   - ${customers.length} customers created`);
    console.log(`   - ${products.length} products created`);
    console.log(`   - ${stockEntries.length} stock entries created`);
    console.log(`   - Initial inventory ledger entries created`);
    console.log(`   - 1 waste entry created`);
    console.log(`   - 3 sale entries created\n`);
    console.log('🔐 Default login credentials:');
    console.log('   Username: admin / Password: password123');
    console.log('   Username: warehouse_manager / Password: password123');
    console.log('   Username: sales_manager / Password: password123');
    console.log('   Username: accountant / Password: password123');
    console.log('   Username: viewer / Password: password123\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run seeder
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
