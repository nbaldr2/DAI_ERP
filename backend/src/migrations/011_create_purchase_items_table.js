const { Sequelize } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable('purchase_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      purchase_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'purchases',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      qty: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 1
      },
      unit_price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      total_price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        onUpdate: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('purchase_items', ['purchase_id']);
    await queryInterface.addIndex('purchase_items', ['product_id']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('purchase_items');
  }
};