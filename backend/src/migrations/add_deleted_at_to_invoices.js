const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

async function addDeletedAtToInvoices() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established.');

    const queryInterface = sequelize.getQueryInterface();
    
    // Add deleted_at column
    console.log('Adding deleted_at column to invoices table...');
    try {
      await queryInterface.addColumn('invoices', 'deleted_at', {
        type: DataTypes.DATE,
        allowNull: true
      });
      console.log('✓ Added deleted_at column');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⚠ deleted_at column already exists');
      } else {
        throw error;
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    process.exit(1);
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  addDeletedAtToInvoices();
}

module.exports = addDeletedAtToInvoices;
