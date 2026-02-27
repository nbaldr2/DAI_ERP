const { sequelize, Product, Warehouse, StockBatch, StockMovement, ProductStock, User } = require('../models');
const stockService = require('../services/stockService');

async function runVerification() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Setup Data
        console.log('\n--- Setup Data ---');
        // Find or create dummy product/warehouse
        let [warehouse1] = await Warehouse.findOrCreate({ where: { name: 'Test Warehouse 1' }, defaults: { location: 'Loc 1' } });
        let [warehouse2] = await Warehouse.findOrCreate({ where: { name: 'Test Warehouse 2' }, defaults: { location: 'Loc 2' } });
        let [product] = await Product.findOrCreate({
            where: { name_en: 'Test Product' },
            defaults: { name_ar: 'TP', description: 'Test', price_per_unit: 10, unit: 'kg' }
        });
        // Find or create a user for performed_by
        let [user] = await User.findOrCreate({ where: { username: 'admin' }, defaults: { email: 'admin@test.com', password: 'password', role: 'ADMIN' } });

        console.log(`Warehouse 1 ID: ${warehouse1.id}`);
        console.log(`Warehouse 2 ID: ${warehouse2.id}`);
        console.log(`Product ID: ${product.id}`);
        console.log(`User ID: ${user.id}`);


        // 2. Test Create Stock Entry
        console.log('\n--- Test 1: Create Stock Entry ---');
        const stockData = {
            product_id: product.id,
            warehouse_id: warehouse1.id,
            supplier_id: 1, // Assume exists or default
            purchase_id: 1,
            pallets: 10,
            pallet_weight: 10,
            total_weight: 100, // 100 kg
            received_weight: 100,
            date_in: new Date(),
            expiry_date: new Date(new Date().getTime() + 86400000 * 30), // 30 days
            status: 'RECEIVED'
        };

        const stockEntry = await stockService.createStockEntry(stockData, user.id);
        console.log(`Stock Entry Created. Batch ID: ${stockEntry.id}, Initial Qty: ${stockEntry.initial_quantity}`);

        // Verify ProductStock
        const ps1 = await ProductStock.findOne({ where: { product_id: product.id, warehouse_id: warehouse1.id } });
        console.log(`ProductStock W1: Available ${ps1.available_quantity}, OnHand ${ps1.quantity_on_hand}`);

        if (parseFloat(ps1.quantity_on_hand) < 100) throw new Error('ProductStock quantity mismatch after entry');


        // 3. Test Transfer (W1 -> W2)
        console.log('\n--- Test 2: Stock Transfer (W1 -> W2) ---');
        const transferData = {
            source_warehouse_id: warehouse1.id,
            destination_warehouse_id: warehouse2.id,
            items: [{ product_id: product.id, batch_id: stockEntry.id, quantity: 10 }]
        };
        let transfer = await stockService.createStockTransfer(transferData, user.id);
        console.log(`Transfer Created (DRAFT). ID: ${transfer.id}`);

        // Start Transfer (IN_TRANSIT)
        transfer = await stockService.updateTransferStatus(transfer.id, 'IN_TRANSIT', user.id);
        console.log(`Transfer Status: ${transfer.status}`);

        // Verify W1 Reduced
        const ps1_after_out = await ProductStock.findOne({ where: { product_id: product.id, warehouse_id: warehouse1.id } });
        console.log(`ProductStock W1 (After OUT): ${ps1_after_out.quantity_on_hand}`);

        // Complete Transfer (COMPLETED)
        transfer = await stockService.updateTransferStatus(transfer.id, 'COMPLETED', user.id);
        console.log(`Transfer Completed.`);

        // Verify W2 Increased
        const ps2 = await ProductStock.findOne({ where: { product_id: product.id, warehouse_id: warehouse2.id } });
        console.log(`ProductStock W2: ${ps2 ? ps2.quantity_on_hand : 'Not Found'}`);

        if (!ps2 || parseFloat(ps2.quantity_on_hand) < 10) throw new Error('ProductStock W2 mismatch after transfer');


        // 4. Test Adjustment (Stocktake - Loss)
        console.log('\n--- Test 3: Stock Adjustment (Loss in W1) ---');
        const adjData = {
            warehouse_id: warehouse1.id,
            reason: 'DAMAGE',
            items: [{ product_id: product.id, batch_id: stockEntry.id, quantity_adjusted: -5, reason: 'Broken' }]
        };
        let adjustment = await stockService.createStockAdjustment(adjData, user.id);
        console.log(`Adjustment Created (DRAFT). ID: ${adjustment.id}`);

        adjustment = await stockService.approveStockAdjustment(adjustment.id, user.id);
        console.log(`Adjustment Approved.`);

        // Verify W1 Reduced further
        const ps1_final = await ProductStock.findOne({ where: { product_id: product.id, warehouse_id: warehouse1.id } });
        console.log(`ProductStock W1 (Final): ${ps1_final.quantity_on_hand}`);

        // 5. Cleanup (Optional, but good for repeatable tests)
        // For now, we leave data to inspect DB if needed.

        console.log('\n--- VERIFICATION SUCCESSFUL ---');
        process.exit(0);
    } catch (error) {
        console.error('\n!!! VERIFICATION FAILED !!!');
        console.error(error);
        process.exit(1);
    }
}

runVerification();
