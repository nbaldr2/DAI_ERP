const { Op } = require('sequelize');
const { DeliveryNote, Invoice, Customer, User } = require('../models');

// List delivery notes with search, filter, pagination
exports.list = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            search,
            status,
            date_from,
            date_to,
            customer_id,
            sort_by = 'created_at',
            sort_order = 'DESC'
        } = req.query;

        const where = {};

        // Search by DN number, invoice number, or customer name
        if (search) {
            where[Op.or] = [
                { dn_number: { [Op.like]: `%${search}%` } },
                { invoice_number: { [Op.like]: `%${search}%` } },
                { customer_name: { [Op.like]: `%${search}%` } }
            ];
        }

        // Filter by status
        if (status && status !== 'all') {
            where.status = status.toUpperCase();
        }

        // Filter by customer
        if (customer_id) {
            where.customer_id = customer_id;
        }

        // Filter by date range
        if (date_from || date_to) {
            where.delivery_date = {};
            if (date_from) where.delivery_date[Op.gte] = date_from;
            if (date_to) where.delivery_date[Op.lte] = date_to;
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await DeliveryNote.findAndCountAll({
            where,
            include: [
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'name', 'contact', 'address']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name']
                }
            ],
            order: [[sort_by, sort_order]],
            limit: parseInt(limit),
            offset
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error listing delivery notes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch delivery notes',
            error: error.message
        });
    }
};

// Get a single delivery note by ID
exports.get = async (req, res) => {
    try {
        const { id } = req.params;

        const deliveryNote = await DeliveryNote.findByPk(id, {
            include: [
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'name', 'contact', 'address']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name']
                }
            ]
        });

        if (!deliveryNote) {
            return res.status(404).json({
                success: false,
                message: 'Delivery note not found'
            });
        }

        res.json({
            success: true,
            data: deliveryNote
        });
    } catch (error) {
        console.error('Error getting delivery note:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch delivery note',
            error: error.message
        });
    }
};

// Create a delivery note from an invoice
exports.create = async (req, res) => {
    try {
        const {
            invoice_id,
            invoice_number,
            customer_id,
            customer_name,
            delivery_date,
            items,
            total_items,
            notes
        } = req.body;

        if (!invoice_id) {
            return res.status(400).json({
                success: false,
                message: 'Invoice ID is required'
            });
        }

        const deliveryNote = await DeliveryNote.create({
            invoice_id,
            invoice_number: invoice_number || null,
            customer_id: customer_id || null,
            customer_name: customer_name || null,
            delivery_date: delivery_date || new Date().toISOString().slice(0, 10),
            items: items || [],
            total_items: total_items || (items ? items.length : 0),
            notes: notes || null,
            created_by: req.user.id
        });

        // Reload with associations
        const result = await DeliveryNote.findByPk(deliveryNote.id, {
            include: [
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'name', 'contact', 'address']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name']
                }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Delivery note created successfully',
            data: result
        });
    } catch (error) {
        console.error('Error creating delivery note:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create delivery note',
            error: error.message
        });
    }
};

// Update delivery note status
exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const deliveryNote = await DeliveryNote.findByPk(id);

        if (!deliveryNote) {
            return res.status(404).json({
                success: false,
                message: 'Delivery note not found'
            });
        }

        const validStatuses = ['PENDING', 'DELIVERED', 'CANCELLED'];
        if (!validStatuses.includes(status?.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        deliveryNote.status = status.toUpperCase();
        deliveryNote.updated_at = new Date();
        await deliveryNote.save();

        res.json({
            success: true,
            message: 'Delivery note status updated',
            data: deliveryNote
        });
    } catch (error) {
        console.error('Error updating delivery note status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update delivery note status',
            error: error.message
        });
    }
};

// Delete a delivery note
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        const deliveryNote = await DeliveryNote.findByPk(id);

        if (!deliveryNote) {
            return res.status(404).json({
                success: false,
                message: 'Delivery note not found'
            });
        }

        await deliveryNote.destroy();

        res.json({
            success: true,
            message: 'Delivery note deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting delivery note:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete delivery note',
            error: error.message
        });
    }
};
