const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InventoryLedger = sequelize.define('InventoryLedger', {
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
  movement_type: {
    type: DataTypes.ENUM('RECEIPT', 'WASTE', 'SALE', 'ADJUSTMENT', 'TRANSFER'),
    allowNull: false
  },
  qty: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Positive for receipts, negative for outs'
  },
  reference_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'E.g., "waste_damage", "sales", "purchase"'
  },
  reference_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of the related entity (waste_id, sale_id, etc.)'
  },
  balance_after: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'Running balance after this movement'
  },
  performed_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  performed_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'inventory_ledger',
  timestamps: false,
  indexes: [
    {
      fields: ['stock_entry_id', 'performed_at']
    },
    {
      fields: ['movement_type']
    },
    {
      fields: ['reference_type', 'reference_id']
    }
  ]
});

// Static method to get latest balance for a stock entry
InventoryLedger.getLatestBalance = async function(stockEntryId, transaction = null) {
  const latestEntry = await this.findOne({
    where: { stock_entry_id: stockEntryId },
    order: [['id', 'DESC']],
    transaction
  });

  return latestEntry ? parseFloat(latestEntry.balance_after) : 0;
};

// Static method to create ledger entry with balance calculation
InventoryLedger.createEntry = async function(data, transaction) {
  const { stock_entry_id, movement_type, qty, reference_type, reference_id, performed_by, note } = data;

  // Get current balance
  const currentBalance = await this.getLatestBalance(stock_entry_id, transaction);

  // Calculate new balance
  const newBalance = currentBalance + parseFloat(qty);

  if (newBalance < 0) {
    throw new Error(`Insufficient stock. Current balance: ${currentBalance}, requested: ${Math.abs(qty)}`);
  }

  // Create ledger entry
  const ledgerEntry = await this.create({
    stock_entry_id,
    movement_type,
    qty,
    reference_type,
    reference_id,
    balance_after: newBalance,
    performed_by,
    note
  }, { transaction });

  return ledgerEntry;
};

module.exports = InventoryLedger;
