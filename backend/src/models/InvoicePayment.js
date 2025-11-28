const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InvoicePayment = sequelize.define('InvoicePayment', {
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
    }
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'invoice_payments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = InvoicePayment;