const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PurchaseItem = sequelize.define('PurchaseItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  purchase_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'purchases',
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
  warehouse_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'warehouses',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 0
    }
  },
  unit_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  total_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'purchase_items',
  timestamps: false
});

module.exports = PurchaseItem;