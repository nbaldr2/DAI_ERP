const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WasteDamage = sequelize.define('WasteDamage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  stock_entry_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'stock_entries',
      key: 'id'
    }
  },
  reason: {
    type: DataTypes.ENUM('WASTE', 'DAMAGE', 'HEALTH_TEST', 'SPOILED','OTHER'),
    allowNull: false,
    defaultValue: 'WASTE'
  },
  waste_weight: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
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
  tableName: 'waste_damage',
  timestamps: false
});

module.exports = WasteDamage;
