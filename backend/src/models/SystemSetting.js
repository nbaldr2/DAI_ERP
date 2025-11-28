const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const SystemSetting = sequelize.define('SystemSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  company_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  pobox: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  cr_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isNumeric: true
    }
  },
  logo_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  language: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'en'
  },
  currency: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'QAR'
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'system_settings',
  timestamps: false,
  hooks: {
    beforeUpdate: (setting) => {
      setting.updated_at = new Date();
    }
  }
});

module.exports = SystemSetting;