const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('invoice_payments', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      invoice_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'invoices',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        validate: {
          min: 0
        }
      },
      payment_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      payment_method: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      reference: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('invoice_payments', ['invoice_id']);
    await queryInterface.addIndex('invoice_payments', ['payment_date']);
    await queryInterface.addIndex('invoice_payments', ['payment_method']);
    await queryInterface.addIndex('invoice_payments', ['created_by']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('invoice_payments');
  }
};