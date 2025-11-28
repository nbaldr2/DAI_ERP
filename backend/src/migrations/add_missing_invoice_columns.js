const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

async function addMissingInvoiceColumns() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Check if columns exist before adding them
    const queryInterface = sequelize.getQueryInterface();
    
    // Add missing columns
    console.log('Adding missing columns to invoices table...');
    
    // Add reference column
    try {
      await queryInterface.addColumn('invoices', 'reference', {
        type: DataTypes.STRING(100),
        allowNull: true
      });
      console.log('✓ Added reference column');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⚠ reference column already exists');
      } else {
        throw error;
      }
    }
    
    // Add payment_mode column
    try {
      await queryInterface.addColumn('invoices', 'payment_mode', {
        type: DataTypes.STRING(50),
        allowNull: true
      });
      console.log('✓ Added payment_mode column');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⚠ payment_mode column already exists');
      } else {
        throw error;
      }
    }
    
    // Add currency column
    try {
      await queryInterface.addColumn('invoices', 'currency', {
        type: DataTypes.STRING(3),
        allowNull: true,
        defaultValue: 'QAR'
      });
      console.log('✓ Added currency column');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⚠ currency column already exists');
      } else {
        throw error;
      }
    }
    
    // Add sale_agent column
    try {
      await queryInterface.addColumn('invoices', 'sale_agent', {
        type: DataTypes.STRING(100),
        allowNull: true
      });
      console.log('✓ Added sale_agent column');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⚠ sale_agent column already exists');
      } else {
        throw error;
      }
    }
    
    // Add discount_type column
    try {
      await queryInterface.addColumn('invoices', 'discount_type', {
        type: DataTypes.ENUM('none', 'percentage', 'fixed'),
        allowNull: true,
        defaultValue: 'none'
      });
      console.log('✓ Added discount_type column');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⚠ discount_type column already exists');
      } else {
        throw error;
      }
    }
    
    // Add discount_value column
    try {
      await queryInterface.addColumn('invoices', 'discount_value', {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0.00
      });
      console.log('✓ Added discount_value column');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⚠ discount_value column already exists');
      } else {
        throw error;
      }
    }
    
    // Add subtotal column
    try {
      await queryInterface.addColumn('invoices', 'subtotal', {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0.00
      });
      console.log('✓ Added subtotal column');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⚠ subtotal column already exists');
      } else {
        throw error;
      }
    }
    
    // Add total_discount column
    try {
      await queryInterface.addColumn('invoices', 'total_discount', {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0.00
      });
      console.log('✓ Added total_discount column');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⚠ total_discount column already exists');
      } else {
        throw error;
      }
    }
    
    // Add total column
    try {
      await queryInterface.addColumn('invoices', 'total', {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0.00
      });
      console.log('✓ Added total column');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⚠ total column already exists');
      } else {
        throw error;
      }
    }
    
    // Add admin_note column
    try {
      await queryInterface.addColumn('invoices', 'admin_note', {
        type: DataTypes.TEXT,
        allowNull: true
      });
      console.log('✓ Added admin_note column');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⚠ admin_note column already exists');
      } else {
        throw error;
      }
    }
    
    // Add client_note column
    try {
      await queryInterface.addColumn('invoices', 'client_note', {
        type: DataTypes.TEXT,
        allowNull: true
      });
      console.log('✓ Added client_note column');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⚠ client_note column already exists');
      } else {
        throw error;
      }
    }
    
    // Add terms column
    try {
      await queryInterface.addColumn('invoices', 'terms', {
        type: DataTypes.TEXT,
        allowNull: true
      });
      console.log('✓ Added terms column');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⚠ terms column already exists');
      } else {
        throw error;
      }
    }
    
    // Rename issue_date to invoice_date if needed
    try {
      // First check if issue_date exists
      const [results] = await sequelize.query("SHOW COLUMNS FROM invoices LIKE 'issue_date'");
      if (results.length > 0) {
        console.log('Renaming issue_date to invoice_date...');
        await queryInterface.renameColumn('invoices', 'issue_date', 'invoice_date');
        console.log('✓ Renamed issue_date to invoice_date');
      } else {
        console.log('✓ invoice_date column already exists (no rename needed)');
      }
    } catch (error) {
      console.log('⚠ Could not rename issue_date column:', error.message);
    }
    
    console.log('\n✅ All missing columns have been added successfully!');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error adding missing columns:', error.message);
    process.exit(1);
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  addMissingInvoiceColumns();
}

module.exports = addMissingInvoiceColumns;