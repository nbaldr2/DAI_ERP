const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Purchase = sequelize.define('Purchase', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  supplier_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'suppliers',
      key: 'id'
    }
  },
  po_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  order_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  expected_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'SENT', 'CONFIRMED', 'RECEIVED', 'CLOSED', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'DRAFT'
  },
  total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'purchases',
  timestamps: false
});

module.exports = Purchase;