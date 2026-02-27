const stockService = require('../services/stockService');
const { StockTransfer, StockTransferItem, Product, Warehouse, User, StockBatch } = require('../models');
const { validationResult } = require('express-validator');

class StockTransferController {

    // POST /api/transfers
    async create(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const userId = req.userId;
            const transfer = await stockService.createStockTransfer(req.body, userId);

            return res.status(201).json({ success: true, data: transfer });
        } catch (error) {
            console.error('Create transfer error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // PUT /api/transfers/:id/status
    async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const userId = req.userId;

            if (!['IN_TRANSIT', 'COMPLETED', 'CANCELLED'].includes(status)) {
                return res.status(400).json({ success: false, message: 'Invalid status' });
            }

            const transfer = await stockService.updateTransferStatus(id, status, userId);

            return res.status(200).json({ success: true, data: transfer });
        } catch (error) {
            console.error('Update transfer status error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // GET /api/transfers
    async list(req, res) {
        try {
            const { source_warehouse_id, destination_warehouse_id, status, page = 1, limit = 50 } = req.query;
            const where = {};

            if (source_warehouse_id) where.source_warehouse_id = source_warehouse_id;
            if (destination_warehouse_id) where.destination_warehouse_id = destination_warehouse_id;
            if (status) where.status = status;

            const offset = (page - 1) * limit;

            const { count, rows } = await StockTransfer.findAndCountAll({
                where,
                include: [
                    { model: Warehouse, as: 'source_warehouse' },
                    { model: Warehouse, as: 'destination_warehouse' },
                    { model: User, as: 'creator', attributes: ['id', 'name'] },
                    { model: User, as: 'receiver', attributes: ['id', 'name'] }
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
            console.error('List transfer error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // GET /api/transfers/:id
    async getById(req, res) {
        try {
            const { id } = req.params;
            const transfer = await StockTransfer.findByPk(id, {
                include: [
                    { model: Warehouse, as: 'source_warehouse' },
                    { model: Warehouse, as: 'destination_warehouse' },
                    { model: User, as: 'creator', attributes: ['id', 'name'] },
                    { model: User, as: 'receiver', attributes: ['id', 'name'] },
                    {
                        model: StockTransferItem,
                        include: [
                            { model: Product, as: 'product' },
                            { model: StockBatch, as: 'batch' }
                        ]
                    }
                ]
            });

            if (!transfer) return res.status(404).json({ success: false, message: 'Transfer not found' });

            return res.status(200).json({ success: true, data: transfer });
        } catch (error) {
            console.error('Get transfer error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new StockTransferController();
