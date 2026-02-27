/**
 * Migration: Create POS Tables
 * Creates pos_sessions, pos_orders, and pos_order_items tables
 */

module.exports = {
    name: '030_create_pos_tables',

    up: async (queryInterface, Sequelize) => {
        const { DataTypes } = Sequelize;

        // Create pos_sessions table
        await queryInterface.createTable('pos_sessions', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: 'users', key: 'id' },
                onDelete: 'CASCADE'
            },
            warehouse_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: 'warehouses', key: 'id' },
                onDelete: 'RESTRICT'
            },
            opening_cash: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
                defaultValue: 0.00
            },
            closing_cash: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: true
            },
            opened_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            },
            closed_at: {
                type: DataTypes.DATE,
                allowNull: true
            },
            status: {
                type: DataTypes.ENUM('OPEN', 'CLOSED'),
                allowNull: false,
                defaultValue: 'OPEN'
            },
            notes: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            created_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW
            },
            updated_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW
            }
        });

        // Create pos_orders table
        await queryInterface.createTable('pos_orders', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            session_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: 'pos_sessions', key: 'id' },
                onDelete: 'CASCADE'
            },
            order_number: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true
            },
            customer_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: { model: 'customers', key: 'id' },
                onDelete: 'SET NULL'
            },
            subtotal: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
                defaultValue: 0.00
            },
            tax_rate: {
                type: DataTypes.DECIMAL(5, 2),
                allowNull: false,
                defaultValue: 0.00
            },
            tax_amount: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
                defaultValue: 0.00
            },
            discount_amount: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
                defaultValue: 0.00
            },
            total: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
                defaultValue: 0.00
            },
            payment_method: {
                type: DataTypes.ENUM('CASH', 'CARD', 'SPLIT'),
                allowNull: false,
                defaultValue: 'CASH'
            },
            cash_received: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: true
            },
            change_amount: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: true
            },
            card_amount: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: true
            },
            status: {
                type: DataTypes.ENUM('COMPLETED', 'VOIDED', 'PARKED'),
                allowNull: false,
                defaultValue: 'COMPLETED'
            },
            notes: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            created_by: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: 'users', key: 'id' },
                onDelete: 'RESTRICT'
            },
            created_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW
            },
            updated_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW
            }
        });

        // Create pos_order_items table
        await queryInterface.createTable('pos_order_items', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            order_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: 'pos_orders', key: 'id' },
                onDelete: 'CASCADE'
            },
            product_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: 'products', key: 'id' },
                onDelete: 'RESTRICT'
            },
            product_name: {
                type: DataTypes.STRING(200),
                allowNull: false,
                comment: 'Snapshot of product name at time of sale'
            },
            qty: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false
            },
            unit: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: 'kg'
            },
            unit_price: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false
            },
            discount: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
                defaultValue: 0.00
            },
            total: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
                defaultValue: 0.00
            },
            created_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW
            },
            updated_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW
            }
        });

        // Add indexes
        await queryInterface.addIndex('pos_sessions', ['user_id']);
        await queryInterface.addIndex('pos_sessions', ['warehouse_id']);
        await queryInterface.addIndex('pos_sessions', ['status']);
        await queryInterface.addIndex('pos_sessions', ['opened_at']);

        await queryInterface.addIndex('pos_orders', ['session_id']);
        await queryInterface.addIndex('pos_orders', ['customer_id']);
        await queryInterface.addIndex('pos_orders', ['order_number']);
        await queryInterface.addIndex('pos_orders', ['status']);
        await queryInterface.addIndex('pos_orders', ['created_at']);

        await queryInterface.addIndex('pos_order_items', ['order_id']);
        await queryInterface.addIndex('pos_order_items', ['product_id']);

        console.log('✅ POS tables created successfully');
    },

    down: async (queryInterface, Sequelize) => {
        // Drop tables in reverse order
        await queryInterface.dropTable('pos_order_items');
        await queryInterface.dropTable('pos_orders');
        await queryInterface.dropTable('pos_sessions');
        console.log('✅ POS tables dropped successfully');
    }
};