const cron = require('node-cron');
const { Product, Warehouse, ProductStock } = require('../models');
const notificationService = require('../services/notificationService');
const { Op } = require('sequelize');

// Run every 4 hours
const CRON_SCHEDULE = process.env.LOW_STOCK_CRON_SCHEDULE || '0 */4 * * *';

/**
 * Check for low stock and generate alerts
 */
async function checkLowStock() {
    try {
        console.log('🔍 Running low stock check...');

        // Find products with stock below min_quantity
        // We join with ProductStock to get current stock levels
        const products = await Product.findAll({
            where: {
                min_quantity: { [Op.gt]: 0 } // Only check products with a min_quantity set
            },
            include: [
                {
                    model: ProductStock,
                    as: 'product_stocks',
                    attributes: ['quantity', 'warehouse_id'],
                    include: [{ model: Warehouse, as: 'warehouse', attributes: ['name'] }]
                }
            ]
        });

        let alertCount = 0;

        for (const product of products) {
            // Calculate total stock across all warehouses
            const totalStock = product.product_stocks.reduce((sum, stock) => sum + parseFloat(stock.quantity), 0);

            if (totalStock < product.min_quantity) {
                console.log(`⚠️ Low Stock: ${product.name_en} (Current: ${totalStock}, Min: ${product.min_quantity})`);

                await notificationService.notifyRole({
                    type: 'WARNING',
                    title: 'Low Stock Alert',
                    message: `Stock for ${product.name_en} is lower than minimum. Current: ${totalStock}, Min: ${product.min_quantity}`,
                    reference_id: product.id,
                    reference_type: 'PRODUCT'
                }, ['ADMIN', 'WAREHOUSE', 'SALES']);

                alertCount++;
            }
        }

        if (alertCount === 0) {
            console.log('✅ No low stock items found.');
        } else {
            console.log(`⚠️ Generated ${alertCount} low stock alerts.`);
        }

    } catch (error) {
        console.error('❌ Error checking low stock:', error);
    }
}

// Schedule the job
const job = cron.schedule(CRON_SCHEDULE, checkLowStock, {
    scheduled: true,
    timezone: "Asia/Qatar"
});

console.log(`✅ Low stock alert cron job scheduled: ${CRON_SCHEDULE}`);

module.exports = {
    job,
    checkLowStock
};
