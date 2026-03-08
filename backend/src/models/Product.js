const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name_en: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  name_ar: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  origin: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'kg'
  },
  min_qty: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  expiry_alert_days: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 7,
    validate: {
      min: 0
    }
  },
  price_per_unit: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  wholesale_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00,
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
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true,
  deletedAt: 'deleted_at'
});

module.exports = Product;
