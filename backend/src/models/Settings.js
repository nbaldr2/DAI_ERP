const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Settings = sequelize.define('Settings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  company_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: { notEmpty: true }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: { isEmail: true }
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  logo_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  language: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'en'
  },
  currency: {
    type: DataTypes.STRING(5),
    allowNull: false,
    defaultValue: 'QAR'
  },
  cr_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: { is: /^[0-9]+$/ }
  },
  tax_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'settings',
  timestamps: false
});

module.exports = Settings;