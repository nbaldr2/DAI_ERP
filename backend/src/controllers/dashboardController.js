const {
    Invoice,
    Sale,
    Expense,
    Product,
    StockEntry,
    Customer,
    User,
    Warehouse,
    WasteDamage,
    InventoryLedger,
    PosOrder,
    PosSession,
    sequelize
} = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

// Helper to get date ranges
const getDateRanges = () => {
    const startOfMonth = moment().startOf('month');
    const startOfLastMonth = moment().subtract(1, 'months').startOf('month');
    const endOfLastMonth = moment().subtract(1, 'months').endOf('month');

    return {
        currentMonthStart: startOfMonth.toDate(),
        lastMonthStart: startOfLastMonth.toDate(),
        lastMonthEnd: endOfLastMonth.toDate()
    };
};

// Calculate percentage growth
const calculateGrowth = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
};

exports.getStats = async (req, res) => {
    try {
        const { currentMonthStart, lastMonthStart, lastMonthEnd } = getDateRanges();
        const today = moment().startOf('day').toDate();
        const tomorrow = moment().endOf('day').toDate();
        const sevenDaysFromNow = moment().add(7, 'days').endOf('day').toDate();

        // 1. Revenue (Invoices + Sales)
        const currentInvoiceRevenue = await Invoice.sum('total', {
            where: {
                invoice_date: { [Op.gte]: currentMonthStart },
                status: { [Op.ne]: 'CANCELLED' }
            }
        }) || 0;

        const currentCashSales = await Sale.sum('total_amount', {
            where: { sale_date: { [Op.gte]: currentMonthStart } }
        }) || 0;

        const totalRevenue = currentInvoiceRevenue + currentCashSales;

        const lastInvoiceRevenue = await Invoice.sum('total', {
            where: {
                invoice_date: { [Op.between]: [lastMonthStart, lastMonthEnd] },
                status: { [Op.ne]: 'CANCELLED' }
            }
        }) || 0;

        const lastCashSales = await Sale.sum('total_amount', {
            where: { sale_date: { [Op.between]: [lastMonthStart, lastMonthEnd] } }
        }) || 0;

        const lastTotalRevenue = lastInvoiceRevenue + lastCashSales;
        const revenueGrowth = calculateGrowth(totalRevenue, lastTotalRevenue);

        // 2. Expenses
        const currentExpenses = await Expense.sum('amount', {
            where: { expense_date: { [Op.gte]: currentMonthStart } }
        }) || 0;

        const lastExpenses = await Expense.sum('amount', {
            where: { expense_date: { [Op.between]: [lastMonthStart, lastMonthEnd] } }
        }) || 0;

        const expenseGrowth = calculateGrowth(currentExpenses, lastExpenses);

        // 3. Profit
        const totalProfit = totalRevenue - currentExpenses;
        const lastProfit = lastTotalRevenue - lastExpenses;
        const profitGrowth = calculateGrowth(totalProfit, lastProfit);

        // 4. Pending Invoices (with real growth)
        const pendingInvoices = await Invoice.count({
            where: { status: 'PENDING' }
        });

        const currentMonthPending = await Invoice.count({
            where: {
                status: 'PENDING',
                invoice_date: { [Op.gte]: currentMonthStart }
            }
        });

        const lastMonthPending = await Invoice.count({
            where: {
                status: 'PENDING',
                invoice_date: { [Op.between]: [lastMonthStart, lastMonthEnd] }
            }
        });

        const pendingGrowth = calculateGrowth(currentMonthPending, lastMonthPending);

        // 5. Total Customers
        const totalCustomers = await Customer.count();
        const currentMonthCustomers = await Customer.count({
            where: { created_at: { [Op.gte]: currentMonthStart } }
        });
        const lastMonthCustomers = await Customer.count({
            where: { created_at: { [Op.between]: [lastMonthStart, lastMonthEnd] } }
        });
        const customerGrowth = calculateGrowth(currentMonthCustomers, lastMonthCustomers);

        // 6. Today's Sales
        const todaySales = await Sale.sum('total_amount', {
            where: { sale_date: { [Op.between]: [today, tomorrow] } }
        }) || 0;

        const todayInvoices = await Invoice.sum('total', {
            where: {
                invoice_date: { [Op.between]: [today, tomorrow] },
                status: { [Op.ne]: 'CANCELLED' }
            }
        }) || 0;

        const todayTotal = todaySales + todayInvoices;

        const yesterdayStart = moment().subtract(1, 'day').startOf('day').toDate();
        const yesterdayEnd = moment().subtract(1, 'day').endOf('day').toDate();
        const yesterdaySales = (await Sale.sum('total_amount', {
            where: { sale_date: { [Op.between]: [yesterdayStart, yesterdayEnd] } }
        }) || 0) + (await Invoice.sum('total', {
            where: {
                invoice_date: { [Op.between]: [yesterdayStart, yesterdayEnd] },
                status: { [Op.ne]: 'CANCELLED' }
            }
        }) || 0);

        const todayGrowth = calculateGrowth(todayTotal, yesterdaySales);

        // 7. Total Stock (kg)
        const totalStock = await StockEntry.sum('total_weight', {
            where: { status: { [Op.in]: ['RECEIVED', 'INSPECTED'] } }
        }) || 0;

        // 8. Near-Expiry Items Count
        const nearExpiryCount = await StockEntry.count({
            where: {
                expiry_date: {
                    [Op.between]: [today, sevenDaysFromNow]
                },
                status: { [Op.in]: ['RECEIVED', 'INSPECTED'] }
            }
        });

        // 9. Unpaid/Overdue Invoices
        const unpaidInvoicesCount = await Invoice.count({
            where: {
                status: { [Op.in]: ['PENDING', 'PARTIAL', 'OVERDUE'] }
            }
        });

        const unpaidInvoicesTotal = await Invoice.sum('total_gross', {
            where: {
                status: { [Op.in]: ['PENDING', 'PARTIAL', 'OVERDUE'] }
            }
        }) || 0;

        // 10. Low Stock Alert (Active stock across entries grouped by product <= min_qty)
        // First get products with min_qty > 0
        const productsWithMinQty = await Product.findAll({
            where: { min_qty: { [Op.gt]: 0 } },
            attributes: ['id', 'min_qty', 'name_en']
        });

        let lowStockCount = 0;

        // Count how many products have total active stock <= min_qty
        for (const product of productsWithMinQty) {
            const latestLedgerEntries = await InventoryLedger.findAll({
                attributes: ['stock_entry_id', [sequelize.fn('MAX', sequelize.col('InventoryLedger.id')), 'maxId']],
                include: [{
                    model: StockEntry,
                    as: 'stock_entry',
                    where: { product_id: product.id, status: { [Op.in]: ['RECEIVED', 'INSPECTED'] } },
                    attributes: []
                }],
                group: ['stock_entry_id']
            });

            const maxLedgerIds = latestLedgerEntries.map(l => l.getDataValue('maxId'));
            let totalAvailableWeight = 0;

            if (maxLedgerIds.length > 0) {
                const activeLedgers = await InventoryLedger.findAll({
                    where: { id: { [Op.in]: maxLedgerIds } },
                    attributes: ['balance_after']
                });
                totalAvailableWeight = activeLedgers.reduce((sum, l) => sum + parseFloat(l.balance_after), 0);
            }
            if (totalAvailableWeight <= product.min_qty) {
                lowStockCount++;
            }
        }

        // 11. Waste this month vs last month
        const currentWaste = await WasteDamage.sum('waste_weight', {
            where: { created_at: { [Op.gte]: currentMonthStart } }
        }) || 0;

        const lastWaste = await WasteDamage.sum('waste_weight', {
            where: { created_at: { [Op.between]: [lastMonthStart, lastMonthEnd] } }
        }) || 0;

        const wasteGrowth = calculateGrowth(currentWaste, lastWaste);

        // 12. POS Sales Today
        const posTodaySales = await PosOrder.sum('total', {
            where: {
                status: 'COMPLETED',
                created_at: {
                    [Op.gte]: today,
                    [Op.lte]: moment().endOf('day').toDate()
                }
            }
        }) || 0;

        // 13. Active POS Sessions
        const activePosSessions = await PosSession.count({
            where: { status: 'OPEN' }
        });

        res.json({
            success: true,
            data: {
                revenue: {
                    value: totalRevenue,
                    growth: revenueGrowth,
                    isPositive: revenueGrowth >= 0
                },
                profit: {
                    value: totalProfit,
                    growth: profitGrowth,
                    isPositive: profitGrowth >= 0
                },
                expenses: {
                    value: currentExpenses,
                    growth: expenseGrowth,
                    isPositive: expenseGrowth <= 0
                },
                pending_orders: {
                    value: pendingInvoices,
                    growth: pendingGrowth,
                    isPositive: pendingGrowth <= 0 // fewer pending is better
                },
                customers: {
                    value: totalCustomers,
                    growth: customerGrowth,
                    isPositive: customerGrowth >= 0
                },
                today_sales: {
                    value: todayTotal,
                    growth: todayGrowth,
                    isPositive: todayGrowth >= 0
                },
                total_stock: {
                    value: totalStock,
                    label: 'kg'
                },
                near_expiry: {
                    value: nearExpiryCount,
                    isPositive: nearExpiryCount === 0 // 0 near-expiry is good
                },
                unpaid_invoices: {
                    value: unpaidInvoicesCount,
                    totalValue: unpaidInvoicesTotal,
                    isPositive: unpaidInvoicesCount === 0
                },
                low_stock: {
                    value: lowStockCount,
                    isPositive: lowStockCount === 0
                },
                waste: {
                    value: currentWaste,
                    growth: wasteGrowth,
                    isPositive: wasteGrowth <= 0
                },
                pos_today_sales: {
                    value: posTodaySales,
                    isPositive: posTodaySales > 0
                },
                pos_active_sessions: {
                    value: activePosSessions,
                    isPositive: activePosSessions > 0
                }
            }
        });

    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard stats',
            error: error.message
        });
    }
};

exports.getRecentActivity = async (req, res) => {
    try {
        const limit = 10;

        const sales = await Sale.findAll({
            limit,
            order: [['created_at', 'DESC']],
            include: [
                { model: Customer, as: 'customer', attributes: ['name'] },
                { model: User, as: 'creator', attributes: ['username'] }
            ]
        });

        const invoices = await Invoice.findAll({
            limit,
            order: [['created_at', 'DESC']],
            include: [
                { model: Customer, as: 'customer', attributes: ['name'] },
                { model: User, as: 'creator', attributes: ['username'] }
            ]
        });

        const stockEntries = await StockEntry.findAll({
            limit,
            where: { status: { [Op.in]: ['RECEIVED', 'INSPECTED'] } },
            order: [['created_at', 'DESC']],
            include: [
                { model: Product, as: 'product', attributes: ['name_en'] },
                { model: User, as: 'creator', attributes: ['username'] }
            ]
        });

        const activities = [
            ...sales.map(s => ({
                id: `sale-${s.id}`,
                type: 'SALE',
                title: 'New Cash Sale',
                description: `${s.sold_weight}kg sold to ${s.customer?.name || 'Walk-in Customer'}`,
                amount: s.total_amount,
                user: s.creator?.username || 'System',
                timestamp: s.created_at
            })),
            ...invoices.map(i => ({
                id: `inv-${i.id}`,
                type: 'INVOICE',
                title: `Invoice #${i.invoice_number}`,
                description: `Created for ${i.customer?.name}`,
                amount: i.total,
                status: i.status,
                user: i.creator?.username || 'System',
                timestamp: i.created_at
            })),
            ...stockEntries.map(s => ({
                id: `stock-${s.id}`,
                type: 'STOCK',
                title: 'Stock Received',
                description: `${s.total_weight}kg of ${s.product?.name_en}`,
                user: s.creator?.username || 'System',
                timestamp: s.created_at
            }))
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);

        res.json({ success: true, data: activities });

    } catch (error) {
        console.error('Dashboard Activity Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent activity',
            error: error.message
        });
    }
};

exports.getChartData = async (req, res) => {
    try {
        const months = 6;
        const startDate = moment().subtract(months - 1, 'months').startOf('month').toDate();

        // 1. Fetch Raw Data for Revenue vs Expenses
        const invoices = await Invoice.findAll({
            attributes: ['total', 'invoice_date'],
            where: {
                invoice_date: { [Op.gte]: startDate },
                status: { [Op.ne]: 'CANCELLED' }
            },
            raw: true
        });

        const sales = await Sale.findAll({
            attributes: ['total_amount', 'sale_date'],
            where: { sale_date: { [Op.gte]: startDate } },
            raw: true
        });

        const expenses = await Expense.findAll({
            attributes: ['amount', 'expense_date'],
            where: { expense_date: { [Op.gte]: startDate } },
            raw: true
        });

        // Aggregation in JS
        const revenueMap = {};
        const expenseMap = {};

        for (let i = 0; i < months; i++) {
            const m = moment().subtract(months - 1 - i, 'months').format('YYYY-MM');
            revenueMap[m] = 0;
            expenseMap[m] = 0;
        }

        invoices.forEach(inv => {
            if (inv.invoice_date) {
                const m = moment(inv.invoice_date).format('YYYY-MM');
                if (revenueMap[m] !== undefined) {
                    revenueMap[m] += parseFloat(inv.total || 0);
                }
            }
        });

        sales.forEach(sale => {
            if (sale.sale_date) {
                const m = moment(sale.sale_date).format('YYYY-MM');
                if (revenueMap[m] !== undefined) {
                    revenueMap[m] += parseFloat(sale.total_amount || 0);
                }
            }
        });

        expenses.forEach(exp => {
            if (exp.expense_date) {
                const m = moment(exp.expense_date).format('YYYY-MM');
                if (expenseMap[m] !== undefined) {
                    expenseMap[m] += parseFloat(exp.amount || 0);
                }
            }
        });

        const labels = Object.keys(revenueMap).sort().map(m => moment(m, 'YYYY-MM').format('MMM'));
        const revenueData = Object.keys(revenueMap).sort().map(m => revenueMap[m]);
        const expenseData = Object.keys(expenseMap).sort().map(m => expenseMap[m]);

        // 2. Fetch Raw Data for Waste Trending
        const wasteRecords = await WasteDamage.findAll({
            attributes: ['waste_weight', 'created_at'],
            where: { created_at: { [Op.gte]: startDate } },
            raw: true
        });

        const wasteMap = {};
        for (let i = 0; i < months; i++) {
            const m = moment().subtract(months - 1 - i, 'months').format('YYYY-MM');
            wasteMap[m] = 0;
        }

        wasteRecords.forEach(w => {
            if (w.created_at) {
                const m = moment(w.created_at).format('YYYY-MM');
                if (wasteMap[m] !== undefined) {
                    wasteMap[m] += parseFloat(w.waste_weight || 0);
                }
            }
        });
        const wasteData = Object.keys(wasteMap).sort().map(m => wasteMap[m]);

        // 2. Product Distribution (Top 5)
        const recentSales = await Sale.findAll({
            attributes: ['sold_weight'],
            include: [{
                model: StockEntry,
                as: 'stock_entry',
                attributes: [],
                required: true,
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['name_en'],
                    required: true
                }]
            }],
            where: {
                sale_date: { [Op.gte]: moment().subtract(30, 'days').toDate() }
            },
            raw: true,
            nest: true
        });

        const productWeightMap = {};
        recentSales.forEach(sale => {
            const productName = sale.stock_entry?.product?.name_en || 'Unknown Product';
            productWeightMap[productName] = (productWeightMap[productName] || 0) + parseFloat(sale.sold_weight || 0);
        });

        const sortedProducts = Object.entries(productWeightMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        const productLabels = sortedProducts.map(([name]) => name);
        const productData = sortedProducts.map(([, weight]) => weight);

        res.json({
            success: true,
            data: {
                revenueVsExpenses: {
                    labels,
                    revenue: revenueData,
                    expenses: expenseData,
                    waste: wasteData
                },
                topProducts: {
                    labels: productLabels,
                    data: productData
                }
            }
        });

    } catch (error) {
        console.error('Dashboard Chart Data Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch chart data',
            error: error.message
        });
    }
};

exports.getExpiringStock = async (req, res) => {
    try {
        const today = moment().startOf('day').toDate();
        const sevenDaysFromNow = moment().add(7, 'days').endOf('day').toDate();

        const expiringItems = await StockEntry.findAll({
            where: {
                expiry_date: { [Op.between]: [today, sevenDaysFromNow] },
                status: { [Op.in]: ['RECEIVED', 'INSPECTED'] }
            },
            include: [
                { model: Product, as: 'product', attributes: ['name_en', 'name_ar'] },
                { model: Warehouse, as: 'warehouse', attributes: ['name'] }
            ],
            order: [['expiry_date', 'ASC']],
            limit: 10
        });

        const data = expiringItems.map(item => {
            const expiryDate = moment(item.expiry_date);
            const daysRemaining = expiryDate.diff(moment(), 'days');
            return {
                id: item.id,
                product_name: item.product?.name_en || 'Unknown',
                warehouse: item.warehouse?.name || 'Unknown',
                weight: parseFloat(item.total_weight || 0),
                expiry_date: item.expiry_date,
                days_remaining: daysRemaining,
                urgency: daysRemaining <= 2 ? 'critical' : daysRemaining <= 4 ? 'warning' : 'info'
            };
        });

        res.json({ success: true, data });

    } catch (error) {
        console.error('Dashboard Expiring Stock Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch expiring stock',
            error: error.message
        });
    }
};

exports.getAlerts = async (req, res) => {
    try {
        // 1. Overdue Invoices
        const overdueInvoices = await Invoice.findAll({
            where: {
                status: { [Op.in]: ['PENDING', 'PARTIAL', 'OVERDUE'] },
                due_date: { [Op.lt]: new Date() }
            },
            include: [
                { model: Customer, as: 'customer', attributes: ['name'] }
            ],
            order: [['due_date', 'ASC']],
            limit: 15
        });

        const overdueAlerts = overdueInvoices.map(inv => {
            const daysOverdue = moment().diff(moment(inv.due_date), 'days');
            return {
                id: inv.id,
                type: 'invoice',
                title: `Invoice #${inv.invoice_number}`,
                description: inv.customer?.name || 'Unknown',
                amount: inv.total,
                date: inv.due_date,
                days_overdue: daysOverdue,
                urgency: daysOverdue > 14 ? 'critical' : 'warning'
            };
        });

        // 2. Low Stock Products
        const productsWithMinQty = await Product.findAll({
            where: { min_qty: { [Op.gt]: 0 } },
            attributes: ['id', 'min_qty', 'name_en']
        });

        const lowStockAlerts = [];

        for (const product of productsWithMinQty) {
            const latestLedgerEntries = await InventoryLedger.findAll({
                attributes: ['stock_entry_id', [sequelize.fn('MAX', sequelize.col('InventoryLedger.id')), 'maxId']],
                include: [{
                    model: StockEntry,
                    as: 'stock_entry',
                    where: { product_id: product.id, status: { [Op.in]: ['RECEIVED', 'INSPECTED'] } },
                    attributes: []
                }],
                group: ['stock_entry_id']
            });

            const maxLedgerIds = latestLedgerEntries.map(l => l.getDataValue('maxId'));
            let totalAvailableWeight = 0;

            if (maxLedgerIds.length > 0) {
                const activeLedgers = await InventoryLedger.findAll({
                    where: { id: { [Op.in]: maxLedgerIds } },
                    attributes: ['balance_after']
                });
                totalAvailableWeight = activeLedgers.reduce((sum, l) => sum + parseFloat(l.balance_after), 0);
            }
            if (totalAvailableWeight <= product.min_qty) {
                lowStockAlerts.push({
                    id: product.id,
                    type: 'stock',
                    title: product.name_en,
                    description: `Min required: ${product.min_qty}kg`,
                    amount: totalAvailableWeight, // current available weight
                    urgency: totalAvailableWeight === 0 ? 'critical' : 'warning'
                });
            }
        }

        res.json({
            success: true,
            data: {
                overdue_invoices: overdueAlerts,
                low_stock: lowStockAlerts.sort((a, b) => a.amount - b.amount)
            }
        });

    } catch (error) {
        console.error('Dashboard Alerts Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch critical alerts',
            error: error.message
        });
    }
};
