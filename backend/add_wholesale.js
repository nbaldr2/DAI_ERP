const { sequelize } = require('./src/config/database');

async function addWholesalePrice() {
    try {
        await sequelize.query('ALTER TABLE products ADD COLUMN wholesale_price DECIMAL(10, 2) DEFAULT 0.00 AFTER price_per_unit');
        console.log('Successfully added wholesale_price column');
    } catch (err) {
        if (err.message.includes('Duplicate column name')) {
            console.log('wholesale_price column already exists');
        } else {
            console.error('Error adding wholesale_price:', err);
        }
    } finally {
        process.exit(0);
    }
}

addWholesalePrice();
