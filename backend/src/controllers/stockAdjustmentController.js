const stockService = require('../services/stockService');
const { StockAdjustment, StockAdjustmentItem, Product, Warehouse, User, StockBatch } = require('../models');
const { validationResult } = require('express-validator');

class StockAdjustmentController {

    // POST /api/adjustments
    async create(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const userId = req.userId;
            const adjustment = await stockService.createStockAdjustment(req.body, userId);

            return res.status(201).json({ success: true, data: adjustment });
        } catch (error) {
            console.error('Create adjustment error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // POST /api/adjustments/:id/approve
    async approve(req, res) {
        try {
            const { id } = req.params;
            const userId = req.userId;

            const adjustment = await stockService.approveStockAdjustment(id, userId);

            return res.status(200).json({ success: true, data: adjustment });
        } catch (error) {
            console.error('Approve adjustment error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // GET /api/adjustments
    async list(req, res) {
        try {
            const { warehouse_id, status, page = 1, limit = 50 } = req.query;
            const where = {};

            if (warehouse_id) where.warehouse_id = warehouse_id;
            if (status) where.status = status;

            const offset = (page - 1) * limit;

            const { count, rows } = await StockAdjustment.findAndCountAll({
                where,
                include: [
                    { model: Warehouse, as: 'warehouse' },
                    { model: User, as: 'creator', attributes: ['id', 'name'] },
                    { model: User, as: 'approver', attributes: ['id', 'name'] }
                ],
                limit: parseInt(limit, 10),
                offset: parseInt(offset, 10),
                order: [['created_at', 'DESC']]
            });

            return res.status(200).json({
                success: true,
                data: rows,
                pagination: {
                    total: count,
                    page: parseInt(page, 10),
                    limit: parseInt(limit, 10),
                    totalPages: Math.ceil(count / limit)
                }
            });
        } catch (error) {
            console.error('List adjustment error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // GET /api/adjustments/:id
    async getById(req, res) {
        try {
            const { id } = req.params;
            const adjustment = await StockAdjustment.findByPk(id, {
                include: [
                    { model: Warehouse, as: 'warehouse' },
                    { model: User, as: 'creator', attributes: ['id', 'name'] },
                    { model: User, as: 'approver', attributes: ['id', 'name'] },
                    {
                        model: StockAdjustmentItem,
                        include: [
                            { model: Product, as: 'product' },
                            { model: StockBatch, as: 'batch' }
                        ]
                    }
                ]
            });

            if (!adjustment) return res.status(404).json({ success: false, message: 'Adjustment not found' });

            return res.status(200).json({ success: true, data: adjustment });
        } catch (error) {
            console.error('Get adjustment error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new StockAdjustmentController();
