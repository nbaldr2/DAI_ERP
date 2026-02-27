const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const DeliveryNote = sequelize.define('DeliveryNote', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    dn_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    invoice_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'invoices',
            key: 'id'
        }
    },
    invoice_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Snapshot of invoice number at creation time'
    },
    customer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'customers',
            key: 'id'
        }
    },
    customer_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Snapshot of customer name'
    },
    delivery_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'DELIVERED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'PENDING'
    },
    items: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'JSON snapshot of invoice items for the delivery note'
    },
    total_items: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
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
    }
}, {
    tableName: 'delivery_notes',
    timestamps: false,
    hooks: {
        beforeValidate: async (dn) => {
            // Generate DN number if not provided
            if (!dn.dn_number) {
                const lastDn = await DeliveryNote.findOne({
                    where: {
                        dn_number: {
                            [Sequelize.Op.like]: 'DN-%'
                        }
                    },
                    order: [['id', 'DESC']],
                    attributes: ['dn_number']
                });

                let nextNumber = 100001;
                if (lastDn) {
                    const lastNumber = parseInt(lastDn.dn_number.replace('DN-', ''));
                    if (!isNaN(lastNumber)) {
                        nextNumber = lastNumber + 1;
                    }
                }

                dn.dn_number = `DN-${nextNumber.toString().padStart(6, '0')}`;
            }
        }
    }
});

module.exports = DeliveryNote;
