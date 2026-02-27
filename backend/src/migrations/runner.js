const { sequelize } = require('../config/database');
const { Sequelize } = require('sequelize');

// Migration functions
const migrations = [
  {
    name: '018_add_reason_to_waste_damage',
    up: async (queryInterface) => {
      // Add reason column to waste_damage if not exists
      const table = await queryInterface.describeTable('waste_damage');
      if (!table.reason) {
        await queryInterface.addColumn('waste_damage', 'reason', {
          type: Sequelize.ENUM('WASTE', 'DAMAGE', 'HEALTH_TEST', 'SPOILED', 'OTHER'),
          allowNull: false,
          defaultValue: 'WASTE'
        });
      }
    },
    down: async (queryInterface) => {
      // Remove reason column and enum type
      const dialect = queryInterface.sequelize.getDialect();
      await queryInterface.removeColumn('waste_damage', 'reason').catch(() => { });
      // Clean up enum in Postgres if applicable; MySQL ignores this
      if (dialect === 'postgres') {
        await queryInterface.sequelize.query("DROP TYPE IF EXISTS \"enum_waste_damage_reason\";").catch(() => { });
      }
    }
  },
  {
    name: '015_create_purchase_items_table',
    up: async (queryInterface) => {
      await queryInterface.createTable('purchase_items', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        purchase_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'purchases',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        product_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'products',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        quantity: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        unit_price: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00
        },
        total_price: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0.00
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      });

      await queryInterface.addIndex('purchase_items', ['purchase_id']);
      await queryInterface.addIndex('purchase_items', ['product_id']);
    },
    down: async (queryInterface) => {
      await queryInterface.dropTable('purchase_items');
    }
  },
  {
    name: '016_add_warehouse_to_purchase_items',
    up: async (queryInterface) => {
      // Add warehouse_id column to purchase_items table
      await queryInterface.addColumn('purchase_items', 'warehouse_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'warehouses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });

      // Add index for warehouse_id
      await queryInterface.addIndex('purchase_items', ['warehouse_id']);
    },
    down: async (queryInterface) => {
      // Remove warehouse_id column from purchase_items table
      await queryInterface.removeColumn('purchase_items', 'warehouse_id');
    }
  },
  {
    name: '017_update_stock_entries_add_columns_and_standardize_status',
    up: async (queryInterface) => {
      // 1) Safely add new nullable columns (idempotent)
      const table = await queryInterface.describeTable('stock_entries');

      if (!table.purchase_id) {
        await queryInterface.addColumn('stock_entries', 'purchase_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'purchases', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        });
        await queryInterface.addIndex('stock_entries', ['purchase_id']).catch(() => { });
      }

      if (!table.received_weight) {
        await queryInterface.addColumn('stock_entries', 'received_weight', {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true
        });
      }

      if (!table.accepted_weight) {
        await queryInterface.addColumn('stock_entries', 'accepted_weight', {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true
        });
      }

      if (!table.created_by) {
        await queryInterface.addColumn('stock_entries', 'created_by', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        });
        await queryInterface.addIndex('stock_entries', ['created_by']).catch(() => { });
      }

      // 2) Temporarily widen enum to include both old and new values
      await queryInterface.changeColumn('stock_entries', 'status', {
        type: Sequelize.ENUM('RECEIVED', 'QUARANTINE', 'AVAILABLE', 'CLOSED', 'PENDING', 'INSPECTED', 'COMPLETED'),
        allowNull: false
      });

      // 3) Migrate existing status values to the new set
      // AVAILABLE -> RECEIVED, QUARANTINE -> PENDING, CLOSED -> COMPLETED
      await queryInterface.sequelize.query("UPDATE stock_entries SET status = 'RECEIVED' WHERE status = 'AVAILABLE'");
      await queryInterface.sequelize.query("UPDATE stock_entries SET status = 'PENDING' WHERE status = 'QUARANTINE'");
      await queryInterface.sequelize.query("UPDATE stock_entries SET status = 'COMPLETED' WHERE status = 'CLOSED'");

      // 4) Restrict enum to the standardized values with default PENDING
      await queryInterface.changeColumn('stock_entries', 'status', {
        type: Sequelize.ENUM('PENDING', 'RECEIVED', 'INSPECTED', 'COMPLETED'),
        allowNull: false,
        defaultValue: 'PENDING'
      });
    },
    down: async (queryInterface) => {
      // Revert enum back to previous values
      // First widen enum to allow old values, then map statuses to old set
      await queryInterface.changeColumn('stock_entries', 'status', {
        type: Sequelize.ENUM('RECEIVED', 'QUARANTINE', 'AVAILABLE', 'CLOSED', 'PENDING', 'INSPECTED', 'COMPLETED'),
        allowNull: false
      });

      await queryInterface.sequelize.query("UPDATE stock_entries SET status = 'AVAILABLE' WHERE status = 'INSPECTED'");
      await queryInterface.sequelize.query("UPDATE stock_entries SET status = 'QUARANTINE' WHERE status = 'PENDING'");
      await queryInterface.sequelize.query("UPDATE stock_entries SET status = 'CLOSED' WHERE status = 'COMPLETED'");

      await queryInterface.changeColumn('stock_entries', 'status', {
        type: Sequelize.ENUM('RECEIVED', 'QUARANTINE', 'AVAILABLE', 'CLOSED'),
        allowNull: false,
        defaultValue: 'AVAILABLE'
      });

      // Remove added columns
      await queryInterface.removeIndex('stock_entries', ['purchase_id']).catch(() => { });
      await queryInterface.removeIndex('stock_entries', ['created_by']).catch(() => { });
      await queryInterface.removeColumn('stock_entries', 'purchase_id');
      await queryInterface.removeColumn('stock_entries', 'received_weight');
      await queryInterface.removeColumn('stock_entries', 'accepted_weight');
      await queryInterface.removeColumn('stock_entries', 'created_by');
    }
  },
  {
    name: '001_create_users_table',
    up: async (queryInterface) => {
      await queryInterface.createTable('users', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        username: {
          type: Sequelize.STRING(100),
          allowNull: false,
          unique: true
        },
        password_hash: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        name: {
          type: Sequelize.STRING(150),
          allowNull: false
        },
        role: {
          type: Sequelize.ENUM('ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTANT', 'VIEWER'),
          allowNull: false,
          defaultValue: 'VIEWER'
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });

      await queryInterface.addIndex('users', ['username']);
      await queryInterface.addIndex('users', ['role']);
    },
    down: async (queryInterface) => {
      await queryInterface.dropTable('users');
    }
  },
  {
    name: '002_create_warehouses_table',
    up: async (queryInterface) => {
      await queryInterface.createTable('warehouses', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: Sequelize.STRING(150),
          allowNull: false
        },
        location: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true
        }
      });

      await queryInterface.addIndex('warehouses', ['deleted_at']);
    },
    down: async (queryInterface) => {
      await queryInterface.dropTable('warehouses');
    }
  },
  {
    name: '003_create_suppliers_table',
    up: async (queryInterface) => {
      await queryInterface.createTable('suppliers', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: Sequelize.STRING(150),
          allowNull: false
        },
        contact_person: {
          type: Sequelize.STRING(150),
          allowNull: true
        },
        phone: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        email: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        address: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        country: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true
        }
      });

      await queryInterface.addIndex('suppliers', ['deleted_at']);
      await queryInterface.addIndex('suppliers', ['country']);
    },
    down: async (queryInterface) => {
      await queryInterface.dropTable('suppliers');
    }
  },
  {
    name: '004_create_customers_table',
    up: async (queryInterface) => {
      await queryInterface.createTable('customers', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: Sequelize.STRING(150),
          allowNull: false
        },
        contact: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        address: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        type: {
          type: Sequelize.ENUM('RETAIL', 'WHOLESALE'),
          allowNull: false,
          defaultValue: 'RETAIL'
        },
        credit_limit: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true,
          defaultValue: 0.00
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true
        }
      });

      await queryInterface.addIndex('customers', ['type']);
      await queryInterface.addIndex('customers', ['deleted_at']);
    },
    down: async (queryInterface) => {
      await queryInterface.dropTable('customers');
    }
  },
  {
    name: '005_create_products_table',
    up: async (queryInterface) => {
      await queryInterface.createTable('products', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name_en: {
          type: Sequelize.STRING(150),
          allowNull: false
        },
        name_ar: {
          type: Sequelize.STRING(150),
          allowNull: true
        },
        category: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        origin: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        unit: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'kg'
        },
        min_qty: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0
        },
        expiry_alert_days: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 7
        },
        price_per_unit: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true
        }
      });

      await queryInterface.addIndex('products', ['category']);
      await queryInterface.addIndex('products', ['deleted_at']);
      await queryInterface.addIndex('products', ['name_en']);
    },
    down: async (queryInterface) => {
      await queryInterface.dropTable('products');
    }
  },
  {
    name: '006_create_stock_entries_table',
    up: async (queryInterface) => {
      await queryInterface.createTable('stock_entries', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        product_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'products',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        supplier_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'suppliers',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        warehouse_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'warehouses',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        pallets: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        pallet_weight: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        total_weight: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false
        },
        date_in: {
          type: Sequelize.DATEONLY,
          allowNull: false
        },
        expiry_date: {
          type: Sequelize.DATEONLY,
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('RECEIVED', 'QUARANTINE', 'AVAILABLE', 'CLOSED'),
          allowNull: false,
          defaultValue: 'AVAILABLE'
        },
        version: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true
        }
      });

      await queryInterface.addIndex('stock_entries', ['product_id']);
      await queryInterface.addIndex('stock_entries', ['supplier_id']);
      await queryInterface.addIndex('stock_entries', ['warehouse_id']);
      await queryInterface.addIndex('stock_entries', ['status']);
      await queryInterface.addIndex('stock_entries', ['expiry_date']);
      await queryInterface.addIndex('stock_entries', ['date_in']);
      await queryInterface.addIndex('stock_entries', ['deleted_at']);
    },
    down: async (queryInterface) => {
      await queryInterface.dropTable('stock_entries');
    }
  },
  {
    name: '007_create_inventory_ledger_table',
    up: async (queryInterface) => {
      await queryInterface.createTable('inventory_ledger', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        stock_entry_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'stock_entries',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        movement_type: {
          type: Sequelize.ENUM('RECEIPT', 'WASTE', 'SALE', 'ADJUSTMENT', 'TRANSFER'),
          allowNull: false
        },
        qty: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          comment: 'Positive for receipts, negative for outs'
        },
        reference_type: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        reference_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        balance_after: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false
        },
        performed_by: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        performed_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        note: {
          type: Sequelize.TEXT,
          allowNull: true
        }
      });

      await queryInterface.addIndex('inventory_ledger', ['stock_entry_id', 'performed_at']);
      await queryInterface.addIndex('inventory_ledger', ['movement_type']);
      await queryInterface.addIndex('inventory_ledger', ['reference_type', 'reference_id']);
      await queryInterface.addIndex('inventory_ledger', ['performed_by']);
    },
    down: async (queryInterface) => {
      await queryInterface.dropTable('inventory_ledger');
    }
  },
  {
    name: '008_create_waste_damage_table',
    up: async (queryInterface) => {
      await queryInterface.createTable('waste_damage', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        stock_entry_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'stock_entries',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        waste_weight: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        }
      });

      await queryInterface.addIndex('waste_damage', ['stock_entry_id']);
      await queryInterface.addIndex('waste_damage', ['created_by']);
      await queryInterface.addIndex('waste_damage', ['created_at']);
    },
    down: async (queryInterface) => {
      await queryInterface.dropTable('waste_damage');
    }
  },
  {
    name: '009_create_sales_table',
    up: async (queryInterface) => {
      await queryInterface.createTable('sales', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        stock_entry_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'stock_entries',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        customer_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'customers',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        sold_weight: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        unit_price: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0.00
        },
        total_amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true,
          defaultValue: 0.00
        },
        sale_date: {
          type: Sequelize.DATEONLY,
          allowNull: false
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        }
      });

      await queryInterface.addIndex('sales', ['stock_entry_id']);
      await queryInterface.addIndex('sales', ['customer_id']);
      await queryInterface.addIndex('sales', ['sale_date']);
      await queryInterface.addIndex('sales', ['created_by']);
    },
    down: async (queryInterface) => {
      await queryInterface.dropTable('sales');
    }
  },
  {
    name: '010_create_purchases_table',
    up: async (queryInterface) => {
      await queryInterface.createTable('purchases', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        supplier_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'suppliers',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        po_number: {
          type: Sequelize.STRING(100),
          allowNull: false,
          unique: true
        },
        order_date: {
          type: Sequelize.DATEONLY,
          allowNull: false
        },
        expected_date: {
          type: Sequelize.DATEONLY,
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM('DRAFT', 'SENT', 'CONFIRMED', 'RECEIVED', 'CLOSED', 'CANCELLED'),
          allowNull: false,
          defaultValue: 'DRAFT'
        },
        total: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0.00
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        },
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        }
      });

      await queryInterface.addIndex('purchases', ['supplier_id']);
      await queryInterface.addIndex('purchases', ['po_number']);
      await queryInterface.addIndex('purchases', ['status']);
      await queryInterface.addIndex('purchases', ['order_date']);
    },
    down: async (queryInterface) => {
      await queryInterface.dropTable('purchases');
    }
  },
  {
    name: '011_create_invoices_table',
    up: async (queryInterface) => {
      await queryInterface.createTable('invoices', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        invoice_number: {
          type: Sequelize.STRING(100),
          allowNull: false,
          unique: true
        },
        invoice_type: {
          type: Sequelize.ENUM('SALE', 'PURCHASE'),
          allowNull: false,
          defaultValue: 'SALE'
        },
        reference_type: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        reference_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        customer_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'customers',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        supplier_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'suppliers',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        issue_date: {
          type: Sequelize.DATEONLY,
          allowNull: false
        },
        due_date: {
          type: Sequelize.DATEONLY,
          allowNull: true
        },
        total_net: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0.00
        },
        total_tax: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0.00
        },
        total_gross: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0.00
        },
        discount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0.00
        },
        status: {
          type: Sequelize.ENUM('DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED'),
          allowNull: false,
          defaultValue: 'DRAFT'
        },
        pdf_path: {
          type: Sequelize.STRING(500),
          allowNull: true
        },
        qr_code: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        language: {
          type: Sequelize.ENUM('EN', 'AR', 'BOTH'),
          allowNull: false,
          defaultValue: 'BOTH'
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        },
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        }
      });

      await queryInterface.addIndex('invoices', ['invoice_number']);
      await queryInterface.addIndex('invoices', ['customer_id']);
      await queryInterface.addIndex('invoices', ['supplier_id']);
      await queryInterface.addIndex('invoices', ['status']);
      await queryInterface.addIndex('invoices', ['issue_date']);
      await queryInterface.addIndex('invoices', ['reference_type', 'reference_id']);
    },
    down: async (queryInterface) => {
      await queryInterface.dropTable('invoices');
    }
  },
  {
    name: '012_add_missing_invoice_columns',
    up: async (queryInterface) => {
      // Add missing columns to match the database schema
      await queryInterface.addColumn('invoices', 'reference', {
        type: Sequelize.STRING(100),
        allowNull: true
      });

      await queryInterface.addColumn('invoices', 'payment_mode', {
        type: Sequelize.STRING(50),
        allowNull: true
      });

      await queryInterface.addColumn('invoices', 'currency', {
        type: Sequelize.STRING(3),
        allowNull: true,
        defaultValue: 'QAR'
      });

      await queryInterface.addColumn('invoices', 'sale_agent', {
        type: Sequelize.STRING(100),
        allowNull: true
      });

      await queryInterface.addColumn('invoices', 'discount_type', {
        type: Sequelize.ENUM('none', 'percentage', 'fixed'),
        allowNull: true,
        defaultValue: 'none'
      });

      await queryInterface.addColumn('invoices', 'discount_value', {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0.00
      });

      await queryInterface.addColumn('invoices', 'subtotal', {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0.00
      });

      await queryInterface.addColumn('invoices', 'total_discount', {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0.00
      });

      await queryInterface.addColumn('invoices', 'total', {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0.00
      });

      await queryInterface.addColumn('invoices', 'admin_note', {
        type: Sequelize.TEXT,
        allowNull: true
      });

      await queryInterface.addColumn('invoices', 'client_note', {
        type: Sequelize.TEXT,
        allowNull: true
      });

      await queryInterface.addColumn('invoices', 'terms', {
        type: Sequelize.TEXT,
        allowNull: true
      });

      // Rename issue_date to invoice_date to match the database schema
      await queryInterface.renameColumn('invoices', 'issue_date', 'invoice_date');
    },
    down: async (queryInterface) => {
      // Reverse the changes
      await queryInterface.renameColumn('invoices', 'invoice_date', 'issue_date');

      await queryInterface.removeColumn('invoices', 'terms');
      await queryInterface.removeColumn('invoices', 'client_note');
      await queryInterface.removeColumn('invoices', 'admin_note');
      await queryInterface.removeColumn('invoices', 'total');
      await queryInterface.removeColumn('invoices', 'total_discount');
      await queryInterface.removeColumn('invoices', 'subtotal');
      await queryInterface.removeColumn('invoices', 'discount_value');
      await queryInterface.removeColumn('invoices', 'discount_type');
      await queryInterface.removeColumn('invoices', 'sale_agent');
      await queryInterface.removeColumn('invoices', 'currency');
      await queryInterface.removeColumn('invoices', 'payment_mode');
      await queryInterface.removeColumn('invoices', 'reference');
    }
  },
  {
    name: '012_create_audit_logs_table',
    up: async (queryInterface) => {
      await queryInterface.createTable('audit_logs', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        entity_type: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        entity_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        action: {
          type: Sequelize.ENUM('CREATE', 'UPDATE', 'DELETE', 'RESTORE'),
          allowNull: false
        },
        old_value: {
          type: Sequelize.JSON,
          allowNull: true
        },
        new_value: {
          type: Sequelize.JSON,
          allowNull: true
        },
        changes: {
          type: Sequelize.JSON,
          allowNull: true
        },
        performed_by: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        performed_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        ip_address: {
          type: Sequelize.STRING(45),
          allowNull: true
        },
        user_agent: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        }
      });

      await queryInterface.addIndex('audit_logs', ['entity_type', 'entity_id']);
      await queryInterface.addIndex('audit_logs', ['performed_by']);
      await queryInterface.addIndex('audit_logs', ['performed_at']);
      await queryInterface.addIndex('audit_logs', ['action']);
    },
    down: async (queryInterface) => {
      await queryInterface.dropTable('audit_logs');
    }
  },
  {
    name: '013_create_attachments_table',
    up: async (queryInterface) => {
      await queryInterface.createTable('attachments', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        entity_type: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        entity_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        filename: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        stored_filename: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        path: {
          type: Sequelize.STRING(500),
          allowNull: false
        },
        mime_type: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        size: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        uploaded_by: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        uploaded_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });

      await queryInterface.addIndex('attachments', ['entity_type', 'entity_id']);
      await queryInterface.addIndex('attachments', ['uploaded_by']);
    },
    down: async (queryInterface) => {
      await queryInterface.dropTable('attachments');
    }
  },
  {
    name: '014_update_invoice_model',
    up: async (queryInterface) => {
      // This migration is just a placeholder since the logic is in the model
      console.log('Invoice number generation logic moved to model layer');
    },
    down: async (queryInterface) => {
      console.log('Reverting invoice number generation logic');
    }
  }
  ,
  {
    name: '019_create_expenses_table',
    up: async (queryInterface) => {
      await queryInterface.createTable('expenses', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        expense_date: {
          type: Sequelize.DATEONLY,
          allowNull: false
        },
        category: {
          type: Sequelize.STRING(100),
          allowNull: false,
          comment: 'Expense category (e.g., RENT, UTILITIES, SALARIES, SUPPLIES, TRANSPORT, MISC)'
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false
        },
        currency: {
          type: Sequelize.STRING(3),
          allowNull: false,
          defaultValue: 'QAR'
        },
        payment_method: {
          type: Sequelize.ENUM('CASH', 'BANK', 'CARD', 'ONLINE', 'OTHER'),
          allowNull: false,
          defaultValue: 'CASH'
        },
        supplier_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'suppliers',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        reference_type: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        reference_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM('PENDING', 'APPROVED', 'PAID', 'CANCELLED'),
          allowNull: false,
          defaultValue: 'APPROVED'
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true
        }
      });

      await queryInterface.addIndex('expenses', ['expense_date']);
      await queryInterface.addIndex('expenses', ['category']);
      await queryInterface.addIndex('expenses', ['supplier_id']);
      await queryInterface.addIndex('expenses', ['status']);
      await queryInterface.addIndex('expenses', ['created_by']);
    },
    down: async (queryInterface) => {
      const dialect = queryInterface.sequelize.getDialect();
      await queryInterface.dropTable('expenses');
      // Clean up enum in Postgres if applicable; MySQL ignores this
      if (dialect === 'postgres') {
        await queryInterface.sequelize
          .query('DROP TYPE IF EXISTS "enum_expenses_payment_method";')
          .catch(() => { });
        await queryInterface.sequelize
          .query('DROP TYPE IF EXISTS "enum_expenses_status";')
          .catch(() => { });
      }
    }
  }
  ,
  {
    name: '020_create_settings_table',
    up: async (queryInterface) => {
      await queryInterface.createTable('settings', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_name: { type: Sequelize.STRING(255), allowNull: false },
        email: { type: Sequelize.STRING(255), allowNull: true },
        phone: { type: Sequelize.STRING(50), allowNull: true },
        address: { type: Sequelize.TEXT, allowNull: true },
        logo_url: { type: Sequelize.STRING(255), allowNull: true },
        language: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'en' },
        currency: { type: Sequelize.STRING(5), allowNull: false, defaultValue: 'QAR' },
        cr_number: { type: Sequelize.STRING(50), allowNull: true },
        tax_rate: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0.00 },
        updated_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deleted_at: { type: Sequelize.DATE, allowNull: true }
      });
      await queryInterface.addIndex('settings', ['updated_at']);
    },
    down: async (queryInterface) => {
      await queryInterface.dropTable('settings');
    }
  },
  {
    name: '021_create_delivery_notes_table',
    up: async (queryInterface) => {
      // Check if table already exists
      try {
        await queryInterface.describeTable('delivery_notes');
        console.log('  ℹ️  delivery_notes table already exists, skipping.');
        return;
      } catch (e) {
        // Table doesn't exist, create it
      }

      await queryInterface.createTable('delivery_notes', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        dn_number: {
          type: Sequelize.STRING(100),
          allowNull: false,
          unique: true
        },
        invoice_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'invoices',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        invoice_number: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        customer_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'customers',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        customer_name: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        delivery_date: {
          type: Sequelize.DATEONLY,
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('PENDING', 'DELIVERED', 'CANCELLED'),
          allowNull: false,
          defaultValue: 'PENDING'
        },
        items: {
          type: Sequelize.JSON,
          allowNull: true
        },
        total_items: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 0
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });

      await queryInterface.addIndex('delivery_notes', ['invoice_id']);
      await queryInterface.addIndex('delivery_notes', ['customer_id']);
      await queryInterface.addIndex('delivery_notes', ['status']);
      await queryInterface.addIndex('delivery_notes', ['delivery_date']);
      await queryInterface.addIndex('delivery_notes', ['created_by']);
      await queryInterface.addIndex('delivery_notes', ['dn_number']);
    },
    down: async (queryInterface) => {
      await queryInterface.dropTable('delivery_notes');
    }
  }
  ,
  {
    name: '099_rebuild_stock_system',
    up: async (queryInterface) => {

      const transaction = await queryInterface.sequelize.transaction();

      try {
        // Cleanup partial state from failed runs
        await queryInterface.dropTable('product_stocks').catch(() => { });
        await queryInterface.dropTable('stock_batches').catch(() => { });
        // End cleanup

        // 1. Create ProductStock
        await queryInterface.createTable('product_stocks', {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          product_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'products', key: 'id' } },
          warehouse_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'warehouses', key: 'id' } },
          quantity_on_hand: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00 },
          reserved_quantity: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00 },
          available_quantity: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00 },
          created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
          updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        }, { transaction });
        await queryInterface.addIndex('product_stocks', ['product_id', 'warehouse_id'], { unique: true, transaction });

        // 2. Create StockBatch (formerly StockEntry)
        await queryInterface.createTable('stock_batches', {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          product_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'products', key: 'id' } },
          warehouse_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'warehouses', key: 'id' } },
          supplier_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'suppliers', key: 'id' } },
          purchase_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'purchases', key: 'id' } },
          batch_number: { type: Sequelize.STRING(100), allowNull: true },
          initial_quantity: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
          current_quantity: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00 },
          unit_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00 },
          date_received: { type: Sequelize.DATEONLY, allowNull: false },
          expiry_date: { type: Sequelize.DATEONLY, allowNull: true },
          status: { type: Sequelize.ENUM('ACTIVE', 'EXPIRED', 'DEPLETED', 'QUARANTINE'), defaultValue: 'ACTIVE' },
          created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
          updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        }, { transaction });

        // 3. Create StockMovement (formerly InventoryLedger)
        await queryInterface.createTable('stock_movements', {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          product_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'products', key: 'id' } },
          warehouse_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'warehouses', key: 'id' } },
          batch_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'stock_batches', key: 'id' } },
          type: { type: Sequelize.ENUM('IN', 'OUT', 'ADJUST', 'TRANSFER', 'RESERVE', 'UNRESERVE'), allowNull: false },
          quantity: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
          reference_type: { type: Sequelize.STRING(50), allowNull: false },
          reference_id: { type: Sequelize.INTEGER, allowNull: false },
          performed_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
          notes: { type: Sequelize.TEXT, allowNull: true },
          created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        }, { transaction });
        await queryInterface.addIndex('stock_movements', ['batch_id'], { transaction });
        await queryInterface.addIndex('stock_movements', ['reference_type', 'reference_id'], { transaction });

        // 4. Create Adjustments & Transfers tables
        await queryInterface.createTable('stock_adjustments', {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          warehouse_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'warehouses', key: 'id' } },
          reason: { type: Sequelize.ENUM('STOCKTAKE', 'DAMAGE', 'EXPIRED', 'CORRECTION', 'OTHER'), allowNull: false },
          status: { type: Sequelize.ENUM('DRAFT', 'APPROVED', 'REJECTED'), defaultValue: 'DRAFT' },
          notes: { type: Sequelize.TEXT, allowNull: true },
          adjustment_date: { type: Sequelize.DATEONLY, allowNull: false },
          created_by: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
          approved_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
          created_at: { type: Sequelize.DATE },
          updated_at: { type: Sequelize.DATE }
        }, { transaction });

        await queryInterface.createTable('stock_adjustment_items', {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          adjustment_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'stock_adjustments', key: 'id' } },
          product_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'products', key: 'id' } },
          batch_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'stock_batches', key: 'id' } },
          quantity_adjusted: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
          reason: { type: Sequelize.STRING(255), allowNull: true },
          created_at: { type: Sequelize.DATE },
          updated_at: { type: Sequelize.DATE }
        }, { transaction });

        await queryInterface.createTable('stock_transfers', {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          source_warehouse_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'warehouses', key: 'id' } },
          destination_warehouse_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'warehouses', key: 'id' } },
          status: { type: Sequelize.ENUM('DRAFT', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'), defaultValue: 'DRAFT' },
          transfer_date: { type: Sequelize.DATEONLY, allowNull: false },
          notes: { type: Sequelize.TEXT, allowNull: true },
          created_by: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
          received_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
          created_at: { type: Sequelize.DATE },
          updated_at: { type: Sequelize.DATE }
        }, { transaction });

        await queryInterface.createTable('stock_transfer_items', {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          transfer_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'stock_transfers', key: 'id' } },
          product_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'products', key: 'id' } },
          batch_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'stock_batches', key: 'id' } },
          quantity: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
          created_at: { type: Sequelize.DATE },
          updated_at: { type: Sequelize.DATE }
        }, { transaction });

        // --- Data Migration ---

        // 5. Migrate StockEntry -> StockBatch
        // We preserve IDs to make mapping easier
        const stockEntries = await queryInterface.sequelize.query(
          `SELECT se.*, p.price_per_unit 
           FROM stock_entries se 
           JOIN products p ON se.product_id = p.id`,
          { type: Sequelize.QueryTypes.SELECT, transaction }
        );

        for (const entry of stockEntries) {
          // Calculate current quantity from ledger
          const ledgerSum = await queryInterface.sequelize.query(
            `SELECT SUM(qty) as total FROM inventory_ledger WHERE stock_entry_id = :id`,
            {
              replacements: { id: entry.id },
              type: Sequelize.QueryTypes.SELECT,
              transaction
            }
          );
          const currentQty = ledgerSum[0].total || 0;

          let status = 'ACTIVE';
          if (currentQty <= 0) status = 'DEPLETED';
          else if (entry.status === 'QUARANTINE' || entry.status === 'PENDING') status = 'QUARANTINE';

          await queryInterface.sequelize.query(
            `INSERT INTO stock_batches 
             (id, product_id, warehouse_id, supplier_id, purchase_id, initial_quantity, current_quantity, unit_cost, date_received, expiry_date, status, created_at, updated_at)
             VALUES (:id, :product_id, :warehouse_id, :supplier_id, :purchase_id, :initial_quantity, :current_quantity, :unit_cost, :date_received, :expiry_date, :status, :created_at, NOW())`,
            {
              replacements: {
                id: entry.id,
                product_id: entry.product_id,
                warehouse_id: entry.warehouse_id,
                supplier_id: entry.supplier_id,
                purchase_id: entry.purchase_id,
                initial_quantity: entry.accepted_weight || entry.total_weight,
                current_quantity: currentQty,
                unit_cost: entry.price_per_unit || 0,
                date_received: entry.date_in,
                expiry_date: entry.expiry_date,
                status: status,
                created_at: entry.created_at || new Date()
              },
              transaction
            }
          );
        }

        // 6. Migrate InventoryLedger -> StockMovement
        const ledgerEntries = await queryInterface.sequelize.query(
          `SELECT il.*, se.product_id, se.warehouse_id 
           FROM inventory_ledger il
           JOIN stock_entries se ON il.stock_entry_id = se.id`,
          { type: Sequelize.QueryTypes.SELECT, transaction }
        );

        for (const entry of ledgerEntries) {
          let type = 'IN';
          if (entry.movement_type === 'RECEIPT') type = 'IN';
          else if (entry.movement_type === 'SALE' || entry.movement_type === 'WASTE') type = 'OUT';
          else if (entry.movement_type === 'ADJUSTMENT') type = 'ADJUST';
          else if (entry.movement_type === 'TRANSFER') type = 'TRANSFER';

          // Need to set reference_id and type. existing ledger has them.
          // Note: new StockMovement quantity signedness: Positive for IN, Negative for OUT.
          // Existing ledger `qty` is already signed (+/-).
          // However, new schema comment says "Positive for IN, Negative for OUT", so we can trust existing qty.

          await queryInterface.sequelize.query(
            `INSERT INTO stock_movements
             (product_id, warehouse_id, batch_id, type, quantity, reference_type, reference_id, performed_by, notes, created_at)
             VALUES (:product_id, :warehouse_id, :batch_id, :type, :quantity, :reference_type, :reference_id, :performed_by, :notes, :created_at)`,
            {
              replacements: {
                product_id: entry.product_id,
                warehouse_id: entry.warehouse_id,
                batch_id: entry.stock_entry_id,
                type: type,
                quantity: entry.qty,
                reference_type: entry.reference_type || 'manual',
                reference_id: entry.reference_id || 0,
                performed_by: entry.performed_by,
                notes: entry.note,
                created_at: entry.performed_at
              },
              transaction
            }
          );
        }

        // 7. Populate ProductStock Aggregates
        // Sum current_quantity from stock_batches where status = ACTIVE
        const aggregates = await queryInterface.sequelize.query(
          `SELECT product_id, warehouse_id, SUM(current_quantity) as total 
           FROM stock_batches 
           WHERE status = 'ACTIVE' 
           GROUP BY product_id, warehouse_id`,
          { type: Sequelize.QueryTypes.SELECT, transaction }
        );

        for (const agg of aggregates) {
          await queryInterface.sequelize.query(
            `INSERT INTO product_stocks 
             (product_id, warehouse_id, quantity_on_hand, available_quantity, created_at, updated_at)
             VALUES (:product_id, :warehouse_id, :total, :total, NOW(), NOW())`,
            {
              replacements: {
                product_id: agg.product_id,
                warehouse_id: agg.warehouse_id,
                total: agg.total
              },
              transaction
            }
          );
        }

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    },
    down: async (queryInterface) => {
      // Drop all new tables
      await queryInterface.dropTable('stock_transfer_items');
      await queryInterface.dropTable('stock_transfers');
      await queryInterface.dropTable('stock_adjustment_items');
      await queryInterface.dropTable('stock_adjustments');
      await queryInterface.dropTable('stock_movements');
      await queryInterface.dropTable('stock_batches');
      await queryInterface.dropTable('product_stocks');
    }
  },
  {
    name: '030_create_pos_tables',
    up: async (queryInterface) => {
        const { DataTypes } = require('sequelize');

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
    down: async (queryInterface) => {
        // Drop tables in reverse order
        await queryInterface.dropTable('pos_order_items');
        await queryInterface.dropTable('pos_orders');
        await queryInterface.dropTable('pos_sessions');
        console.log('✅ POS tables dropped successfully');
    }
  }
];

// Run migrations
async function runMigrations(filter = null) {
  const queryInterface = sequelize.getQueryInterface();

  console.log('🚀 Starting database migrations...\n');

  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established.\n');

    const toRun = filter ? migrations.filter(m => m.name.includes(filter)) : migrations;
    for (const migration of toRun) {
      try {
        console.log(`⏳ Running migration: ${migration.name}`);
        await migration.up(queryInterface);
        console.log(`✅ Migration ${migration.name} completed successfully.\n`);
      } catch (error) {
        console.error(`❌ Migration ${migration.name} failed:`, error.message);
        throw error;
      }
    }

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration process failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Rollback migrations
async function rollbackMigrations() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('🔄 Rolling back database migrations...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.\n');

    // Run migrations in reverse order
    for (let i = migrations.length - 1; i >= 0; i--) {
      const migration = migrations[i];
      try {
        console.log(`⏳ Rolling back migration: ${migration.name}`);
        await migration.down(queryInterface);
        console.log(`✅ Migration ${migration.name} rolled back successfully.\n`);
      } catch (error) {
        console.error(`❌ Rollback of ${migration.name} failed:`, error.message);
        throw error;
      }
    }

    console.log('🎉 All migrations rolled back successfully!');
  } catch (error) {
    console.error('❌ Rollback process failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'down' || command === 'rollback') {
    rollbackMigrations();
  } else if (command) {
    // Run only migrations matching the provided filter substring
    runMigrations(command);
  } else {
    runMigrations();
  }
}

module.exports = { runMigrations, rollbackMigrations };
