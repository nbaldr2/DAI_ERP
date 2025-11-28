const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PurchaseOrderFee = sequelize.define('PurchaseOrderFee', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  purchase_order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'purchases',
      key: 'id'
    }
  },
  fee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'fees',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  currency: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'QAR'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'purchase_order_fees',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = PurchaseOrderFee;