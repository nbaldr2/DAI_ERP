const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InvoiceItem = sequelize.define('InvoiceItem', {
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
    }
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  quantity: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 0
    }
  },
  rate: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  discount: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'invoice_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = InvoiceItem;