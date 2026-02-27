const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Document = sequelize.define('Document', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    filename: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Actual filename stored on disk'
    },
    original_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Original name of the uploaded file'
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
    category: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: 'Uncategorized',
        comment: 'Category of the document (e.g., Financials, Contracts)'
    },
    path: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'Full path or URL to the file'
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
    tableName: 'documents',
    timestamps: false,
    indexes: [
        {
            fields: ['category']
        },
        {
            fields: ['uploaded_by']
        }
    ]
});

// Instance method to get file size in human-readable format
Document.prototype.getReadableSize = function () {
    const bytes = this.size;
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

module.exports = Document;
