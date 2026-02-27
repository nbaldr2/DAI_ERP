const { sequelize, Product, ProductStock, StockMovement, Warehouse, Customer,
    PosSession, PosOrder, PosOrderItem, User } = require('../models');
const { Op } = require('sequelize');

class PosService {

    // ─── Session Management ────────────────────────────────────────────

    async openSession(userId, warehouseId, openingCash = 0) {
        // Check for existing open session for this user
        const existing = await PosSession.findOne({
            where: { user_id: userId, status: 'OPEN' }
        });
        if (existing) {
            return existing;
        }

        return PosSession.create({
            user_id: userId,
            warehouse_id: warehouseId,
            opening_cash: openingCash,
            opened_at: new Date(),
            status: 'OPEN'
        });
    }

    async closeSession(sessionId, closingCash, userId) {
        const session = await PosSession.findByPk(sessionId);
        if (!session) throw new Error('Session not found');
        if (session.user_id !== userId) throw new Error('Not your session');
        if (session.status === 'CLOSED') throw new Error('Session already closed');

        session.closing_cash = closingCash;
        session.closed_at = new Date();
        session.status = 'CLOSED';
        await session.save();
        return session;
    }

    async getCurrentSession(userId) {
        return PosSession.findOne({
            where: { user_id: userId, status: 'OPEN' },
            include: [
                { model: Warehouse, as: 'warehouse' },
                { model: User, as: 'user', attributes: ['id', 'name', 'username', 'role'] }
            ]
        });
    }

    async getSessionSummary(sessionId) {
        const session = await PosSession.findByPk(sessionId, {
            include: [
                { model: Warehouse, as: 'warehouse' },
                { model: User, as: 'user', attributes: ['id', 'name', 'username'] }
            ]
        });
        if (!session) throw new Error('Session not found');

        const orders = await PosOrder.findAll({
            where: { session_id: sessionId, status: 'COMPLETED' }
        });

        const totalSales = orders.reduce((sum, o) => sum + parseFloat(o.total), 0);
        const totalCash = orders.filter(o => o.payment_method === 'CASH')
            .reduce((sum, o) => sum + parseFloat(o.total), 0);
        const totalCard = orders.filter(o => o.payment_method === 'CARD')
            .reduce((sum, o) => sum + parseFloat(o.total), 0);
        const totalSplit = orders.filter(o => o.payment_method === 'SPLIT')
            .reduce((sum, o) => sum + parseFloat(o.total), 0);

        const expectedCash = parseFloat(session.opening_cash) + totalCash +
            orders.filter(o => o.payment_method === 'SPLIT')
                .reduce((sum, o) => sum + parseFloat(o.cash_received || 0) - parseFloat(o.change_amount || 0), 0);

        return {
            session,
            orderCount: orders.length,
            totalSales,
            totalCash,
            totalCard,
            totalSplit,
            expectedCash,
            difference: session.closing_cash ? parseFloat(session.closing_cash) - expectedCash : null
        };
    }

    // ─── Products for POS ──────────────────────────────────────────────

    async getProductsForPOS(warehouseId, search, category, page = 1, limit = 100) {
        const productWhere = { deleted_at: null };
        if (search) {
            productWhere[Op.or] = [
                { name_en: { [Op.like]: `%${search}%` } },
                { name_ar: { [Op.like]: `%${search}%` } }
            ];
        }
        if (category) {
            productWhere.category = category;
        }

        const products = await Product.findAll({
            where: productWhere,
            attributes: ['id', 'name_en', 'name_ar', 'category', 'unit', 'price_per_unit', 'description'],
            order: [['name_en', 'ASC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        // Get stock levels for each product in the specified warehouse
        const productIds = products.map(p => p.id);
        const stockLevels = await ProductStock.findAll({
            where: {
                product_id: { [Op.in]: productIds },
                warehouse_id: warehouseId
            },
            attributes: ['product_id', 'quantity_on_hand']
        });

        const stockMap = {};
        stockLevels.forEach(s => {
            stockMap[s.product_id] = parseFloat(s.quantity_on_hand) || 0;
        });

        // Get unique categories for filter
        const categories = await Product.findAll({
            where: { deleted_at: null },
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']],
            raw: true
        });

        return {
            products: products.map(p => ({
                id: p.id,
                name_en: p.name_en,
                name_ar: p.name_ar,
                category: p.category,
                unit: p.unit,
                price: parseFloat(p.price_per_unit) || 0,
                stock: stockMap[p.id] || 0,
                description: p.description
            })),
            categories: categories.map(c => c.category).filter(Boolean)
        };
    }

    // ─── Order Processing (Transactional) ──────────────────────────────

    async completeSale(sessionId, items, payment, userId) {
        const t = await sequelize.transaction();

        try {
            // Validate session
            const session = await PosSession.findByPk(sessionId, { transaction: t });
            if (!session || session.status !== 'OPEN') {
                throw new Error('No active POS session');
            }

            // Generate order number: POS-YYYYMMDD-XXXX
            const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const count = await PosOrder.count({
                where: {
                    created_at: {
                        [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                },
                transaction: t
            });
            const orderNumber = `POS-${today}-${String(count + 1).padStart(4, '0')}`;

            // Calculate totals from items
            let subtotal = 0;
            const orderItems = [];

            for (const item of items) {
                const product = await Product.findByPk(item.product_id, { transaction: t });
                if (!product) throw new Error(`Product ${item.product_id} not found`);

                const itemDiscount = parseFloat(item.discount) || 0;
                const itemTotal = (parseFloat(item.qty) * parseFloat(item.unit_price || product.price_per_unit)) - itemDiscount;

                orderItems.push({
                    product_id: product.id,
                    product_name: product.name_en,
                    qty: item.qty,
                    unit: product.unit,
                    unit_price: item.unit_price || product.price_per_unit,
                    discount: itemDiscount,
                    total: itemTotal
                });

                subtotal += itemTotal;
            }

            const taxRate = parseFloat(payment.tax_rate) || 0;
            const taxAmount = subtotal * (taxRate / 100);
            const discountAmount = parseFloat(payment.discount_amount) || 0;
            const total = subtotal + taxAmount - discountAmount;

            // Calculate cash/change for cash payments
            let cashReceived = null;
            let changeAmount = null;
            let cardAmount = null;

            if (payment.method === 'CASH') {
                cashReceived = parseFloat(payment.cash_received) || total;
                changeAmount = cashReceived - total;
            } else if (payment.method === 'CARD') {
                cardAmount = total;
            } else if (payment.method === 'SPLIT') {
                cashReceived = parseFloat(payment.cash_amount) || 0;
                cardAmount = parseFloat(payment.card_amount) || 0;
                changeAmount = 0; // Split assumes exact amounts
            }

            // Create the order
            const order = await PosOrder.create({
                session_id: sessionId,
                order_number: orderNumber,
                customer_id: payment.customer_id || null,
                subtotal,
                tax_rate: taxRate,
                tax_amount: taxAmount,
                discount_amount: discountAmount,
                total,
                payment_method: payment.method || 'CASH',
                cash_received: cashReceived,
                change_amount: changeAmount,
                card_amount: cardAmount,
                status: 'COMPLETED',
                notes: payment.notes || null,
                created_by: userId
            }, { transaction: t });

            // Create order items
            const createdItems = [];
            for (const oi of orderItems) {
                const created = await PosOrderItem.create({
                    order_id: order.id,
                    ...oi
                }, { transaction: t });
                createdItems.push(created);
            }

            // CRITICAL: Deduct stock from ProductStock + create StockMovement records
            for (const oi of orderItems) {
                const productStock = await ProductStock.findOne({
                    where: {
                        product_id: oi.product_id,
                        warehouse_id: session.warehouse_id
                    },
                    transaction: t,
                    lock: t.LOCK.UPDATE
                });

                if (productStock) {
                    const newQty = parseFloat(productStock.quantity_on_hand) - parseFloat(oi.qty);
                    productStock.quantity_on_hand = Math.max(0, newQty);
                    await productStock.save({ transaction: t });
                }

                // Create stock movement record
                await StockMovement.create({
                    product_id: oi.product_id,
                    warehouse_id: session.warehouse_id,
                    type: 'OUT',
                    quantity: -Math.abs(parseFloat(oi.qty)),
                    reference_type: 'pos_order',
                    reference_id: order.id,
                    notes: `POS Sale ${orderNumber}`,
                    performed_by: userId
                }, { transaction: t });
            }

            await t.commit();

            // Fetch complete order with items for receipt
            const completeOrder = await PosOrder.findByPk(order.id, {
                include: [
                    { model: PosOrderItem, as: 'items' },
                    { model: User, as: 'creator', attributes: ['id', 'name', 'username'] },
                    { model: Customer, as: 'customer' }
                ]
            });

            return completeOrder;

        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    // ─── Void Order ────────────────────────────────────────────────────

    async voidOrder(orderId, userId) {
        const t = await sequelize.transaction();

        try {
            const order = await PosOrder.findByPk(orderId, {
                include: [
                    { model: PosOrderItem, as: 'items' },
                    { model: PosSession, as: 'session' }
                ],
                transaction: t
            });

            if (!order) throw new Error('Order not found');
            if (order.status === 'VOIDED') throw new Error('Order already voided');

            // Reverse stock deductions
            for (const item of order.items) {
                const productStock = await ProductStock.findOne({
                    where: {
                        product_id: item.product_id,
                        warehouse_id: order.session.warehouse_id
                    },
                    transaction: t,
                    lock: t.LOCK.UPDATE
                });

                if (productStock) {
                    productStock.quantity_on_hand = parseFloat(productStock.quantity_on_hand) + parseFloat(item.qty);
                    await productStock.save({ transaction: t });
                }

                // Create reversal stock movement
                await StockMovement.create({
                    product_id: item.product_id,
                    warehouse_id: order.session.warehouse_id,
                    type: 'IN',
                    quantity: Math.abs(parseFloat(item.qty)),
                    reference_type: 'pos_void',
                    reference_id: order.id,
                    notes: `POS Void ${order.order_number}`,
                    performed_by: userId
                }, { transaction: t });
            }

            order.status = 'VOIDED';
            await order.save({ transaction: t });

            await t.commit();
            return order;

        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    // ─── Park / Resume ─────────────────────────────────────────────────

    async parkOrder(sessionId, items, payment, userId) {
        // Create a parked order (no stock deduction)
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await PosOrder.count({
            where: {
                created_at: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) }
            }
        });
        const orderNumber = `PARK-${today}-${String(count + 1).padStart(4, '0')}`;

        let subtotal = 0;
        const orderItems = [];

        for (const item of items) {
            const product = await Product.findByPk(item.product_id);
            if (!product) continue;
            const itemTotal = parseFloat(item.qty) * parseFloat(item.unit_price || product.price_per_unit);
            orderItems.push({
                product_id: product.id,
                product_name: product.name_en,
                qty: item.qty,
                unit: product.unit,
                unit_price: item.unit_price || product.price_per_unit,
                discount: 0,
                total: itemTotal
            });
            subtotal += itemTotal;
        }

        const order = await PosOrder.create({
            session_id: sessionId,
            order_number: orderNumber,
            subtotal,
            tax_rate: 0,
            tax_amount: 0,
            discount_amount: 0,
            total: subtotal,
            payment_method: 'CASH',
            status: 'PARKED',
            notes: payment?.notes || 'Parked order',
            created_by: userId
        });

        for (const oi of orderItems) {
            await PosOrderItem.create({ order_id: order.id, ...oi });
        }

        return order;
    }

    async getParkedOrders(sessionId) {
        return PosOrder.findAll({
            where: { session_id: sessionId, status: 'PARKED' },
            include: [{ model: PosOrderItem, as: 'items' }],
            order: [['created_at', 'DESC']]
        });
    }

    async resumeParkedOrder(orderId) {
        const order = await PosOrder.findByPk(orderId, {
            include: [{ model: PosOrderItem, as: 'items' }]
        });
        if (!order || order.status !== 'PARKED') throw new Error('No parked order found');
        return order;
    }

    async deleteParkedOrder(orderId) {
        const order = await PosOrder.findByPk(orderId);
        if (!order || order.status !== 'PARKED') throw new Error('No parked order found');
        await PosOrderItem.destroy({ where: { order_id: orderId } });
        await order.destroy();
        return { deleted: true };
    }

    // ─── Receipt ───────────────────────────────────────────────────────

    async getReceiptData(orderId) {
        const order = await PosOrder.findByPk(orderId, {
            include: [
                { model: PosOrderItem, as: 'items' },
                { model: User, as: 'creator', attributes: ['id', 'name'] },
                { model: Customer, as: 'customer' },
                {
                    model: PosSession, as: 'session',
                    include: [{ model: Warehouse, as: 'warehouse' }]
                }
            ]
        });
        if (!order) throw new Error('Order not found');
        return order;
    }

    // ─── Session Orders List ───────────────────────────────────────────

    async getSessionOrders(sessionId, page = 1, limit = 50) {
        const { count, rows } = await PosOrder.findAndCountAll({
            where: { session_id: sessionId },
            include: [
                { model: PosOrderItem, as: 'items' },
                { model: User, as: 'creator', attributes: ['id', 'name'] }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        return {
            data: rows,
            pagination: { total: count, page: parseInt(page), limit: parseInt(limit) }
        };
    }
}

module.exports = new PosService();
