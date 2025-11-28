const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('invoice_attachments', {
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
      file_name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      file_path: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      file_type: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      file_size: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      uploaded_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      uploaded_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('invoice_attachments', ['invoice_id']);
    await queryInterface.addIndex('invoice_attachments', ['file_type']);
    await queryInterface.addIndex('invoice_attachments', ['uploaded_by']);
    await queryInterface.addIndex('invoice_attachments', ['uploaded_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('invoice_attachments');
  }
};