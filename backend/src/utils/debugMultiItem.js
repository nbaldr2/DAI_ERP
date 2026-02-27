const { Quotation, QuotationItem, sequelize } = require('../models');

async function debugMultiItem() {
    const transaction = await sequelize.transaction();
    try {
        console.log('--- START DEBUG ---');

        // 1. Create Quotation with 2 items
        const quotation = await Quotation.create({
            customer_id: 1,
            quotation_date: '2023-11-01',
            valid_until: '2023-11-10',
            status: 'DRAFT',
            created_by: 1,
            quotation_number: undefined // Let hook handle it
        }, { transaction });
        console.log(`Created Quotation ID: ${quotation.id} (Number: ${quotation.quotation_number})`);

        // 2. Add Items
        const itemsData = [
            { product_id: 1, quantity: 10, unit_price: 100, total_price: 1000 },
            { product_id: 2, quantity: 5, unit_price: 200, total_price: 1000 }
        ];

        for (const item of itemsData) {
            await QuotationItem.create({
                quotation_id: quotation.id,
                ...item
            }, { transaction });
        }
        console.log('Created 2 items.');

        await transaction.commit();

        // 3. Verify
        const qCount = await Quotation.count({ where: { id: quotation.id } });
        const iCount = await QuotationItem.count({ where: { quotation_id: quotation.id } });

        console.log(`Verification: Quotations=${qCount}, Items=${iCount}`);

        if (qCount === 1 && iCount === 2) {
            console.log('✅ Logic correct: 1 Quotation contains 2 Items.');
        } else {
            console.log('❌ Logic FAILED.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        if (transaction) await transaction.rollback();
        process.exit(1);
    }
}

debugMultiItem();
