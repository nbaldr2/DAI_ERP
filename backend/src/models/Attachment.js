const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Attachment = sequelize.define('Attachment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  entity_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Type of entity (e.g., "stock_entry", "invoice", "purchase")'
  },
  entity_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID of the entity this attachment belongs to'
  },
  filename: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Original filename'
  },
  stored_filename: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Actual filename stored on disk/S3'
  },
  path: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'Full path or URL to the file'
  },
  mime_type: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'File size in bytes',
    validate: {
      min: 0
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  uploaded_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  uploaded_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'attachments',
  timestamps: false,
  indexes: [
    {
      fields: ['entity_type', 'entity_id']
    },
    {
      fields: ['uploaded_by']
    }
  ]
});

// Instance method to get file size in human-readable format
Attachment.prototype.getReadableSize = function() {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// Static method to get attachments for an entity
Attachment.getForEntity = async function(entity_type, entity_id) {
  return await this.findAll({
    where: {
      entity_type,
      entity_id
    },
    order: [['uploaded_at', 'DESC']],
    include: [
      {
        model: sequelize.models.User,
        as: 'uploader',
        attributes: ['id', 'username', 'name']
      }
    ]
  });
};

module.exports = Attachment;
