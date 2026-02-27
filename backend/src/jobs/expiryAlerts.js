const cron = require('node-cron');
const { StockEntry, Product, Warehouse, InventoryLedger } = require('../models');
const notificationService = require('../services/notificationService');
const { Op } = require('sequelize');

// Alert configuration
const EXPIRY_ALERT_DAYS = parseInt(process.env.EXPIRY_ALERT_DAYS) || 7;
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 2 * * *'; // Daily at 2 AM

/**
 * Check for expiring stock and generate alerts
 */
async function checkExpiringStock() {
  try {
    console.log('🔍 Running expiry check...');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + EXPIRY_ALERT_DAYS);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find stock entries expiring within the alert window
    const expiringStock = await StockEntry.findAll({
      where: {
        status: { [Op.in]: ['RECEIVED', 'INSPECTED'] },
        expiry_date: {
          [Op.lte]: futureDate,
          [Op.gte]: today
        }
      },
      include: [
        { model: Product, as: 'product' },
        { model: Warehouse, as: 'warehouse' }
      ]
    });

    if (expiringStock.length === 0) {
      console.log('✅ No items expiring within the next', EXPIRY_ALERT_DAYS, 'days');
      return;
    }

    // Filter items with available quantity > 0
    const itemsWithStock = [];
    for (const stock of expiringStock) {
      const balance = await InventoryLedger.getLatestBalance(stock.id);
      if (balance > 0) {
        const expiryDate = new Date(stock.expiry_date);
        const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

        itemsWithStock.push({
          stock_entry_id: stock.id,
          product_name: stock.product.name_en,
          product_name_ar: stock.product.name_ar,
          warehouse: stock.warehouse.name,
          available_qty: balance,
          expiry_date: stock.expiry_date,
          days_until_expiry: daysUntilExpiry,
          pallets: stock.pallets
        });
      }
    }

    if (itemsWithStock.length === 0) {
      console.log('✅ No items with available stock expiring within the next', EXPIRY_ALERT_DAYS, 'days');
      return;
    }

    // Sort by days until expiry (most urgent first)
    itemsWithStock.sort((a, b) => a.days_until_expiry - b.days_until_expiry);

    console.log('⚠️  EXPIRY ALERT: Found', itemsWithStock.length, 'items expiring soon:');
    console.log('═══════════════════════════════════════════════════════════');

    itemsWithStock.forEach(item => {
      const urgencySymbol = item.days_until_expiry <= 3 ? '🔴' :
        item.days_until_expiry <= 5 ? '🟠' : '🟡';

      console.log(`${urgencySymbol} ${item.product_name} (${item.product_name_ar})`);
      console.log(`   Warehouse: ${item.warehouse}`);
      console.log(`   Available: ${item.available_qty} kg (${item.pallets} pallets)`);
      console.log(`   Expires: ${item.expiry_date} (${item.days_until_expiry} days)`);
      console.log('   ─────────────────────────────────────────────────────');
    });

    console.log('═══════════════════════════════════════════════════════════');

    // Create notifications for expiring items
    for (const item of itemsWithStock) {
      await notificationService.notifyRole({
        type: item.days_until_expiry <= 3 ? 'ERROR' : 'WARNING',
        title: 'Stock Expiry Alert',
        message: `${item.product_name} in ${item.warehouse} expires in ${item.days_until_expiry} days. Qty: ${item.available_qty}`,
        reference_id: item.stock_entry_id,
        reference_type: 'STOCK_ENTRY'
      }, ['ADMIN', 'WAREHOUSE']);
    }

    return itemsWithStock;
  } catch (error) {
    console.error('❌ Error checking expiring stock:', error);
    throw error;
  }
}

/**
 * Check for already expired stock
 */
async function checkExpiredStock() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiredStock = await StockEntry.findAll({
      where: {
        status: { [Op.in]: ['RECEIVED', 'INSPECTED'] },
        expiry_date: {
          [Op.lt]: today
        }
      },
      include: [
        { model: Product, as: 'product' },
        { model: Warehouse, as: 'warehouse' }
      ]
    });

    if (expiredStock.length === 0) {
      return;
    }

    // Filter items with available quantity > 0
    const expiredWithStock = [];
    for (const stock of expiredStock) {
      const balance = await InventoryLedger.getLatestBalance(stock.id);
      if (balance > 0) {
        expiredWithStock.push({
          stock_entry_id: stock.id,
          product_name: stock.product.name_en,
          warehouse: stock.warehouse.name,
          available_qty: balance,
          expiry_date: stock.expiry_date
        });
      }
    }

    console.log('🚨 CRITICAL: Found', expiredWithStock.length, 'EXPIRED items with available stock:');
    for (const item of expiredWithStock) {
      console.log(`   - ${item.product_name}: ${item.available_qty} kg (expired: ${item.expiry_date})`);

      await notificationService.notifyRole({
        type: 'ERROR',
        title: 'Stock Expired',
        message: `${item.product_name} in ${item.warehouse} HAS EXPIRED on ${item.expiry_date}. Qty: ${item.available_qty}`,
        reference_id: item.stock_entry_id,
        reference_type: 'STOCK_ENTRY'
      }, ['ADMIN', 'WAREHOUSE']);
    }

    return expiredWithStock;
  } catch (error) {
    console.error('❌ Error checking expired stock:', error);
    throw error;
  }
}

/**
 * Main job function
 */
async function runExpiryChecks() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📅 STOCK EXPIRY CHECK - ' + new Date().toISOString());
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    await checkExpiredStock();
    await checkExpiringStock();
  } catch (error) {
    console.error('❌ Expiry check job failed:', error);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

// Schedule the job
const job = cron.schedule(CRON_SCHEDULE, runExpiryChecks, {
  scheduled: true,
  timezone: "Asia/Qatar"
});

console.log(`✅ Expiry alerts cron job scheduled: ${CRON_SCHEDULE} (Qatar timezone)`);
console.log(`   Alert window: ${EXPIRY_ALERT_DAYS} days before expiry`);

// Run once on startup (optional)
if (process.env.RUN_EXPIRY_CHECK_ON_STARTUP === 'true') {
  console.log('🚀 Running initial expiry check on startup...');
  setTimeout(() => {
    runExpiryChecks();
  }, 5000); // Wait 5 seconds after startup
}

module.exports = {
  job,
  runExpiryChecks,
  checkExpiringStock,
  checkExpiredStock
};
