const posService = require('../services/posService');
const { sequelize, PosSession, PosOrder, PosOrderItem, User, Warehouse, Product } = require('../models');
const { Op } = require('sequelize');

class PosController {

    // ─── Session ───────────────────────────────────────────────────────

    async openSession(req, res) {
        try {
            const { warehouse_id, opening_cash } = req.body;
            if (!warehouse_id) {
                return res.status(400).json({ success: false, message: 'warehouse_id is required' });
            }
            const session = await posService.openSession(req.userId, warehouse_id, opening_cash || 0);
            return res.status(201).json({ success: true, data: session });
        } catch (error) {
            console.error('Open POS session error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    async closeSession(req, res) {
        try {
            const { id } = req.params;
            const { closing_cash } = req.body;
            const session = await posService.closeSession(id, closing_cash || 0, req.userId);
            return res.status(200).json({ success: true, data: session });
        } catch (error) {
            console.error('Close POS session error:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getCurrentSession(req, res) {
        try {
            const session = await posService.getCurrentSession(req.userId);
            return res.status(200).json({ success: true, data: session });
        } catch (error) {
            console.error('Get current session error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    async getSessionSummary(req, res) {
        try {
            const { id } = req.params;
            const summary = await posService.getSessionSummary(id);
            return res.status(200).json({ success: true, data: summary });
        } catch (error) {
            console.error('Get session summary error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // ─── Sessions List ─────────────────────────────────────────────────

    async listSessions(req, res) {
        try {
            const { page = 1, limit = 20, status } = req.query;
            const where = {};
            if (status) where.status = status;

            const { count, rows } = await PosSession.findAndCountAll({
                where,
                include: [
                    { model: User, as: 'user', attributes: ['id', 'name', 'username'] },
                    { model: Warehouse, as: 'warehouse', attributes: ['id', 'name'] }
                ],
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset: (parseInt(page) - 1) * parseInt(limit)
            });

            // Attach order totals to each session
            const sessionIds = rows.map(s => s.id);
            const orderStats = await PosOrder.findAll({
                attributes: [
                    'session_id',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'order_count'],
                    [sequelize.fn('SUM', sequelize.col('total')), 'total_sales']
                ],
                where: { session_id: { [Op.in]: sessionIds }, status: 'COMPLETED' },
                group: ['session_id'],
                raw: true
            });

            const statsMap = {};
            orderStats.forEach(s => {
                statsMap[s.session_id] = {
                    order_count: parseInt(s.order_count) || 0,
                    total_sales: parseFloat(s.total_sales) || 0
                };
            });

            const data = rows.map(s => ({
                ...s.toJSON(),
                order_count: statsMap[s.id]?.order_count || 0,
                total_sales: statsMap[s.id]?.total_sales || 0
            }));

            return res.status(200).json({
                success: true,
                data,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / parseInt(limit))
                }
            });
        } catch (error) {
            console.error('List POS sessions error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // ─── Dashboard Stats ───────────────────────────────────────────────

    async getDashboard(req, res) {
        try {
            const now = new Date();

            // Period boundaries
            const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
            const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0, 0, 0, 0);
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfYear = new Date(now.getFullYear(), 0, 1);

            // Helper: aggregate orders in a time range
            async function periodStats(from) {
                const result = await PosOrder.findOne({
                    attributes: [
                        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                        [sequelize.fn('SUM', sequelize.col('total')), 'total']
                    ],
                    where: {
                        status: 'COMPLETED',
                        created_at: { [Op.gte]: from }
                    },
                    raw: true
                });
                return {
                    count: parseInt(result?.count) || 0,
                    total: parseFloat(result?.total) || 0
                };
            }

            const [today, thisWeek, thisMonth, thisYear] = await Promise.all([
                periodStats(startOfToday),
                periodStats(startOfWeek),
                periodStats(startOfMonth),
                periodStats(startOfYear)
            ]);

            // Payment method breakdown (this month)
            const paymentBreakdown = await PosOrder.findAll({
                attributes: [
                    'payment_method',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                    [sequelize.fn('SUM', sequelize.col('total')), 'total']
                ],
                where: { status: 'COMPLETED', created_at: { [Op.gte]: startOfMonth } },
                group: ['payment_method'],
                raw: true
            });

            // Top 10 products this month
            const topProducts = await PosOrderItem.findAll({
                attributes: [
                    'product_name',
                    [sequelize.fn('SUM', sequelize.col('PosOrderItem.qty')), 'qty_sold'],
                    [sequelize.fn('SUM', sequelize.col('PosOrderItem.total')), 'revenue']
                ],
                include: [{
                    model: PosOrder,
                    as: 'order',
                    attributes: [],
                    where: { status: 'COMPLETED', created_at: { [Op.gte]: startOfMonth } }
                }],
                group: ['product_name'],
                order: [[sequelize.fn('SUM', sequelize.col('PosOrderItem.total')), 'DESC']],
                limit: 10,
                raw: true
            });

            // Daily revenue for the last 30 days (chart data)
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(now.getDate() - 30);

            const dailyRevenue = await PosOrder.findAll({
                attributes: [
                    [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
                    [sequelize.fn('SUM', sequelize.col('total')), 'total'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                where: { status: 'COMPLETED', created_at: { [Op.gte]: thirtyDaysAgo } },
                group: [sequelize.fn('DATE', sequelize.col('created_at'))],
                order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
                raw: true
            });

            // Recent 5 sessions
            const recentSessions = await PosSession.findAll({
                include: [
                    { model: User, as: 'user', attributes: ['id', 'name'] },
                    { model: Warehouse, as: 'warehouse', attributes: ['id', 'name'] }
                ],
                order: [['created_at', 'DESC']],
                limit: 5
            });

            // Recent 10 orders
            const recentOrders = await PosOrder.findAll({
                where: { status: 'COMPLETED' },
                include: [
                    { model: User, as: 'creator', attributes: ['id', 'name'] }
                ],
                order: [['created_at', 'DESC']],
                limit: 10
            });

            return res.status(200).json({
                success: true,
                data: {
                    periods: { today, thisWeek, thisMonth, thisYear },
                    paymentBreakdown,
                    topProducts,
                    dailyRevenue,
                    recentSessions,
                    recentOrders
                }
            });
        } catch (error) {
            console.error('POS dashboard error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // ─── Products ──────────────────────────────────────────────────────

    async getProducts(req, res) {
        try {
            const { warehouse_id, search, category, page, limit } = req.query;
            if (!warehouse_id) {
                return res.status(400).json({ success: false, message: 'warehouse_id query param is required' });
            }
            const result = await posService.getProductsForPOS(warehouse_id, search, category, page, limit);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            console.error('Get POS products error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // ─── Orders ────────────────────────────────────────────────────────

    async completeSale(req, res) {
        try {
            const { session_id, items, payment } = req.body;
            if (!session_id || !items || items.length === 0) {
                return res.status(400).json({ success: false, message: 'session_id and items are required' });
            }
            const order = await posService.completeSale(session_id, items, payment || {}, req.userId);
            return res.status(201).json({ success: true, data: order });
        } catch (error) {
            console.error('Complete POS sale error:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async voidOrder(req, res) {
        try {
            const { id } = req.params;
            const order = await posService.voidOrder(id, req.userId);
            return res.status(200).json({ success: true, data: order });
        } catch (error) {
            console.error('Void POS order error:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getReceipt(req, res) {
        try {
            const { id } = req.params;
            const receipt = await posService.getReceiptData(id);
            return res.status(200).json({ success: true, data: receipt });
        } catch (error) {
            console.error('Get receipt error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    async getSessionOrders(req, res) {
        try {
            const { id } = req.params;
            const { page, limit } = req.query;
            const result = await posService.getSessionOrders(id, page, limit);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            console.error('Get session orders error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // ─── Park / Resume ─────────────────────────────────────────────────

    async parkOrder(req, res) {
        try {
            const { session_id, items, payment } = req.body;
            const order = await posService.parkOrder(session_id, items, payment, req.userId);
            return res.status(201).json({ success: true, data: order });
        } catch (error) {
            console.error('Park order error:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async getParkedOrders(req, res) {
        try {
            const { session_id } = req.query;
            const orders = await posService.getParkedOrders(session_id);
            return res.status(200).json({ success: true, data: orders });
        } catch (error) {
            console.error('Get parked orders error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    async resumeParkedOrder(req, res) {
        try {
            const { id } = req.params;
            const order = await posService.resumeParkedOrder(id);
            return res.status(200).json({ success: true, data: order });
        } catch (error) {
            console.error('Resume parked order error:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async deleteParkedOrder(req, res) {
        try {
            const { id } = req.params;
            const result = await posService.deleteParkedOrder(id);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            console.error('Delete parked order error:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new PosController();
