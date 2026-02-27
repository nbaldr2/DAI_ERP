const { Quotation, QuotationItem, Invoice, InvoiceItem, sequelize } = require('../models');

async function debugConversion() {
    const transaction = await sequelize.transaction();
    try {
        console.log('--- START DEBUG CONVERSION ---');

        // 1. Create a mock quotation
        const quotation = await Quotation.create({
            customer_id: 1, // Assumption: customer 1 exists
            quotation_date: '2023-11-01',
            valid_until: '2023-11-10',
            status: 'ACCEPTED',
            created_by: 1,
            total_net: 100,
            total_tax: 0,
            total_gross: 100,
            currency: 'QAR'
        }, { transaction });
        console.log(`Created Quotation ID: ${quotation.id}`);

        // 2. Add Item
        await QuotationItem.create({
            quotation_id: quotation.id,
            product_id: 1, // Assumption: product 1 exists
            product_name: 'Test Product',
            quantity: 1,
            unit_price: 100,
            total_price: 100
        }, { transaction });
        console.log('Added items.');

        // 3. Attempt Conversion Logic (Simulating controller)
        console.log('Attempting Invoice Create...');
        const invoice = await Invoice.create({
            customer_id: quotation.customer_id,
            invoice_date: new Date(),
            status: 'DRAFT',
            total_net: quotation.total_net,
            total_tax: quotation.total_tax,
            total_gross: quotation.total_gross,
            discount: quotation.discount,
            notes: quotation.notes,
            terms: quotation.terms,
            currency: quotation.currency,
            created_by: 1, // Simulating req.user.id
            reference_type: 'quotation',
            reference_id: quotation.id
        }, { transaction });
        console.log(`Invoice Created ID: ${invoice.id}, Number: ${invoice.invoice_number}`);

        await transaction.rollback();
        console.log('✅ Conversion logic seems valid (rolled back for cleanup).');
        process.exit(0);

    } catch (error) {
        console.error('❌ Conversion Failed:', error);
        if (transaction) await transaction.rollback();
        process.exit(1);
    }
}

debugConversion();
