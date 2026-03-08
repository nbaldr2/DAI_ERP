const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  contact: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('RETAIL', 'WHOLESALE'),
    allowNull: false,
    defaultValue: 'RETAIL'
  },
  credit_limit: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  balance: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'customers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: true,
  deletedAt: 'deleted_at'
});

module.exports = Customer;
