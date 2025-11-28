const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

async function addWarehouseToPurchaseItems() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established.');

    const queryInterface = sequelize.getQueryInterface();
    
    // Add warehouse_id column to purchase_items table
    try {
      await queryInterface.addColumn('purchase_items', 'warehouse_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'warehouses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      console.log('✓ Added warehouse_id column to purchase_items table');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⚠ warehouse_id column already exists');
      } else {
        throw error;
      }
    }
    
    // Add index for warehouse_id
    try {
      await queryInterface.addIndex('purchase_items', ['warehouse_id']);
      console.log('✓ Added index for warehouse_id column');
    } catch (error) {
      if (error.message.includes('Duplicate key name')) {
        console.log('⚠ Index for warehouse_id already exists');
      } else {
        throw error;
      }
    }
    
    console.log('\n✅ Warehouse column added successfully!');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error adding warehouse column:', error.message);
    process.exit(1);
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  addWarehouseToPurchaseItems();
}

module.exports = addWarehouseToPurchaseItems;