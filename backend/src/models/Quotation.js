const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const Quotation = sequelize.define('Quotation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    quotation_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    customer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'customers',
            key: 'id'
        }
    },
    quotation_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    valid_until: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED'),
        allowNull: false,
        defaultValue: 'DRAFT'
    },
    total_net: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    total_tax: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    total_gross: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    discount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    terms: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    currency: {
        type: DataTypes.STRING(3),
        allowNull: true,
        defaultValue: 'QAR'
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
    tableName: 'quotations',
    timestamps: false,
    hooks: {
        beforeValidate: async (quotation) => {
            if (!quotation.quotation_number) {
                const lastQuotation = await Quotation.findOne({
                    where: {
                        quotation_number: {
                            [Sequelize.Op.like]: 'QTN-%'
                        }
                    },
                    order: [['id', 'DESC']],
                    attributes: ['quotation_number']
                });

                let nextNumber = 100001;

                if (lastQuotation) {
                    const lastNumber = parseInt(lastQuotation.quotation_number.replace('QTN-', ''));
                    if (!isNaN(lastNumber)) {
                        nextNumber = lastNumber + 1;
                    }
                }

                quotation.quotation_number = `QTN-${nextNumber.toString().padStart(6, '0')}`;
            }
        }
    }
});

module.exports = Quotation;
