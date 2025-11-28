const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  expense_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Expense category (e.g., RENT, UTILITIES, SALARIES, SUPPLIES, TRANSPORT, MISC)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'QAR'
  },
  payment_method: {
    type: DataTypes.ENUM('CASH', 'BANK', 'CARD', 'ONLINE', 'OTHER'),
    allowNull: false,
    defaultValue: 'CASH'
  },
  supplier_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'suppliers',
      key: 'id'
    }
  },
  reference_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  reference_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'PAID', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'APPROVED'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
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
  tableName: 'expenses',
  timestamps: false,
  paranoid: true,
  deletedAt: 'deleted_at'
});

module.exports = Expense;