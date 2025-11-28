const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  entity_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Type of entity (e.g., "stock_entry", "sale", "waste")'
  },
  entity_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID of the entity that was changed'
  },
  action: {
    type: DataTypes.ENUM('CREATE', 'UPDATE', 'DELETE', 'RESTORE'),
    allowNull: false
  },
  old_value: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Previous state of the entity (null for CREATE)'
  },
  new_value: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'New state of the entity (null for DELETE)'
  },
  changes: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Object containing only the changed fields'
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
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP address of the user who performed the action'
  },
  user_agent: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'User agent string from the request'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'audit_logs',
  timestamps: false,
  indexes: [
    {
      fields: ['entity_type', 'entity_id']
    },
    {
      fields: ['performed_by']
    },
    {
      fields: ['performed_at']
    },
    {
      fields: ['action']
    }
  ]
});

// Static method to create audit log entry
AuditLog.logChange = async function(data, transaction = null) {
  const { entity_type, entity_id, action, old_value, new_value, performed_by, ip_address, user_agent, notes } = data;

  // Calculate changes for UPDATE actions
  let changes = null;
  if (action === 'UPDATE' && old_value && new_value) {
    changes = {};
    for (const key in new_value) {
      if (JSON.stringify(old_value[key]) !== JSON.stringify(new_value[key])) {
        changes[key] = {
          from: old_value[key],
          to: new_value[key]
        };
      }
    }
  }

  return await this.create({
    entity_type,
    entity_id,
    action,
    old_value,
    new_value,
    changes,
    performed_by,
    ip_address,
    user_agent,
    notes
  }, { transaction });
};

// Static method to get audit trail for an entity
AuditLog.getTrail = async function(entity_type, entity_id, options = {}) {
  const { limit = 50, offset = 0 } = options;

  return await this.findAll({
    where: {
      entity_type,
      entity_id
    },
    order: [['performed_at', 'DESC']],
    limit,
    offset,
    include: [
      {
        model: sequelize.models.User,
        as: 'performer',
        attributes: ['id', 'username', 'name', 'role']
      }
    ]
  });
};

module.exports = AuditLog;
