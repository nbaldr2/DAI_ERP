const { Quotation, QuotationItem, Customer, Product, User, Invoice, InvoiceItem } = require('../models');
const { sequelize } = require('../config/database');
const notificationService = require('../services/notificationService');
const { Op } = require('sequelize');

const VALID_QUOTATION_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CONVERTED', 'CANCELLED'];

const normalizeQuotationStatus = (status) => {
    if (status === undefined || status === null) return null;
    return String(status).trim().toUpperCase();
};

exports.createQuotation = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { customer_id, quotation_date, valid_until, items, discount, notes, terms, currency } = req.body;

        const quotation = await Quotation.create({
            customer_id,
            quotation_date,
            valid_until,
            discount: discount || 0,
            notes,
            terms,
            currency: currency || 'QAR',
            created_by: req.user.id,
            status: 'DRAFT'
        }, { transaction });

        let totalNet = 0;
        let totalTax = 0;

        if (items && items.length > 0) {
            for (const item of items) {
                const itemTotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
                const itemTax = itemTotal * (parseFloat(item.tax_rate || 0) / 100);

                totalNet += itemTotal;
                totalTax += itemTax;

                await QuotationItem.create({
                    quotation_id: quotation.id,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    tax_rate: item.tax_rate || 0,
                    total_price: itemTotal
                }, { transaction });
            }
        }

        quotation.total_net = totalNet;
        quotation.total_tax = totalTax;
        quotation.total_gross = totalNet + totalTax - (parseFloat(discount) || 0);

        await quotation.save({ transaction });
        await transaction.commit();

        // Send notification to Admin and Sales
        await notificationService.notifyRole({
            type: 'INFO',
            title: 'New Quotation Created',
            message: `Quotation created for ${quotation.total_gross} ${currency}.`,
            reference_id: quotation.id,
            reference_type: 'QUOTATION'
        }, ['ADMIN', 'SALES']);

        const fullQuotation = await Quotation.findByPk(quotation.id, {
            include: [
                { model: QuotationItem, as: 'items' },
                { model: Customer, as: 'customer' }
            ]
        });

        res.status(201).json({ success: true, data: fullQuotation });
    } catch (error) {
        await transaction.rollback();
        console.error('Create quotation error:', error);
        res.status(500).json({ success: false, message: 'Failed to create quotation', error: error.message });
    }
};

exports.getQuotations = async (req, res) => {
    try {
        const { page = 1, limit = 50, status, search } = req.query;
        const offset = (page - 1) * limit;

        const where = {};
        if (status) where.status = status;
        if (search) {
            where[Op.or] = [
                { quotation_number: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await Quotation.findAndCountAll({
            where,
            include: [
                { model: Customer, as: 'customer', attributes: ['name', 'contact'] },
                { model: User, as: 'creator', attributes: ['name'] }
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Get quotations error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch quotations' });
    }
};

exports.getQuotationById = async (req, res) => {
    try {
        const quotation = await Quotation.findByPk(req.params.id, {
            include: [
                { model: QuotationItem, as: 'items', include: [{ model: Product, as: 'product' }] },
                { model: Customer, as: 'customer' },
                { model: User, as: 'creator', attributes: ['name', 'username'] }
            ]
        });

        if (!quotation) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        res.json({ success: true, data: quotation });
    } catch (error) {
        console.error('Get quotation error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch quotation' });
    }
};

exports.updateQuotation = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { customer_id, quotation_date, valid_until, items, discount, notes, terms, status, currency } = req.body;

        const quotation = await Quotation.findByPk(id);
        if (!quotation) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        // Update main fields
        await quotation.update({
            customer_id,
            quotation_date,
            valid_until,
            discount: discount || 0,
            notes,
            terms,
            status: status || quotation.status,
            currency: currency || quotation.currency
        }, { transaction });

        // Update items if provided
        if (items) {
            // Delete existing items
            await QuotationItem.destroy({ where: { quotation_id: id }, transaction });

            let totalNet = 0;
            let totalTax = 0;

            for (const item of items) {
                const itemTotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
                const itemTax = itemTotal * (parseFloat(item.tax_rate || 0) / 100);

                totalNet += itemTotal;
                totalTax += itemTax;

                await QuotationItem.create({
                    quotation_id: id,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    tax_rate: item.tax_rate || 0,
                    total_price: itemTotal
                }, { transaction });
            }

            quotation.total_net = totalNet;
            quotation.total_tax = totalTax;
            quotation.total_gross = totalNet + totalTax - (parseFloat(discount) || 0);
            await quotation.save({ transaction });
        }

        await transaction.commit();
        res.json({ success: true, message: 'Quotation updated successfully' });
    } catch (error) {
        await transaction.rollback();
        console.error('Update quotation error:', error);
        res.status(500).json({ success: false, message: 'Failed to update quotation' });
    }
};

exports.deleteQuotation = async (req, res) => {
    try {
        const quotation = await Quotation.findByPk(req.params.id);
        if (!quotation) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        await quotation.destroy();
        res.json({ success: true, message: 'Quotation deleted successfully' });
    } catch (error) {
        console.error('Delete quotation error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete quotation' });
    }
};

exports.convertToInvoice = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const quotation = await Quotation.findByPk(id, {
            include: [{ model: QuotationItem, as: 'items' }],
            transaction
        });

        if (!quotation) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        if (quotation.status === 'CONVERTED') {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Quotation already converted' });
        }

        if (!quotation.items || quotation.items.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Quotation has no items to convert' });
        }

        const totalNet = parseFloat(quotation.total_net || 0);
        const totalTax = parseFloat(quotation.total_tax || 0);
        const totalGross = parseFloat(quotation.total_gross || totalNet + totalTax);

        // Generate invoice number
        const lastInvoice = await Invoice.findOne({
            where: {
                invoice_number: {
                    [Op.like]: 'INV-%'
                }
            },
            order: [['invoice_number', 'DESC']],
            transaction
        });

        let nextNumber = 250001;
        if (lastInvoice) {
            const lastNumber = parseInt(lastInvoice.invoice_number.replace('INV-', ''));
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }
        const invoiceNumber = `INV-${nextNumber.toString().padStart(6, '0')}`;

        // Create Invoice
        const invoiceData = {
            invoice_number: invoiceNumber,
            customer_id: quotation.customer_id,
            invoice_date: new Date(),
            status: 'DRAFT',
            total_net: totalNet,
            total_tax: totalTax,
            total_gross: totalGross,
            discount: quotation.discount || 0,
            notes: quotation.notes,
            terms: quotation.terms,
            currency: quotation.currency || 'QAR',
            created_by: req.user?.id,
            reference_type: 'quotation',
            reference_id: quotation.id
        };

        console.log('Creating invoice with data:', invoiceData);

        const invoice = await Invoice.create(invoiceData, { transaction });
        console.log('Invoice created:', invoice.id);

        const resolvedItems = [];

        for (let i = 0; i < quotation.items.length; i++) {
            const item = quotation.items[i];
            console.log(`Processing item ${i}:`, { product_id: item.product_id, product_name: item.product_name });

            let productId = item.product_id;

            if (!productId && item.product_name) {
                try {
                    const matchedProduct = await Product.findOne({
                        where: {
                            [Op.or]: [
                                { name_en: item.product_name },
                                { name_ar: item.product_name }
                            ]
                        },
                        transaction
                    });
                    if (matchedProduct) {
                        productId = matchedProduct.id;
                        console.log('Found existing product:', productId);
                    }
                } catch (findError) {
                    console.error('Error finding product:', findError);
                }
            }

            const quantity = parseFloat(item.quantity || 0);
            const unitPrice = parseFloat(item.unit_price || 0);
            const totalPrice = item.total_price != null ? parseFloat(item.total_price) : quantity * unitPrice;

            if (!productId) {
                const productName = item.product_name || 'Quotation Item';
                console.log('Creating new product:', productName);

                try {
                    const newProduct = await Product.create({
                        name_en: productName,
                        name_ar: item.product_name || null,
                        unit: 'kg',
                        price_per_unit: unitPrice || 0.0,
                        category: null,
                        origin: null,
                        description: item.description || null
                    }, { transaction });
                    productId = newProduct.id;
                    console.log('Created new product:', productId);
                } catch (productError) {
                    console.error('Error creating product:', productError);
                    throw new Error(`Failed to create product "${productName}": ${productError.message}`);
                }
            }

            resolvedItems.push({
                invoice_id: invoice.id,
                product_id: productId,
                description: item.description || item.product_name || 'Item',
                quantity: quantity,
                rate: unitPrice,
                discount: 0,
                amount: totalPrice
            });
        }

        console.log('Creating invoice items:', resolvedItems.length);

        for (let i = 0; i < resolvedItems.length; i++) {
            const item = resolvedItems[i];
            console.log(`Creating invoice item ${i}:`, item);
            try {
                await InvoiceItem.create(item, { transaction });
            } catch (itemError) {
                console.error(`Error creating invoice item ${i}:`, itemError);
                throw new Error(`Failed to create invoice item: ${itemError.message}`);
            }
        }

        // Update Quotation Status
        await quotation.update({ status: 'CONVERTED' }, { transaction });

        await transaction.commit();
        console.log('Conversion successful, invoiceId:', invoice.id);
        res.json({ success: true, message: 'Converted to invoice successfully', invoiceId: invoice.id });
    } catch (error) {
        console.error('Convert quotation error - FULL ERROR:', error);
        console.error('Error stack:', error.stack);

        if (transaction) {
            try {
                await transaction.rollback();
                console.log('Transaction rolled back');
            } catch (rollbackError) {
                console.error('Error rolling back transaction:', rollbackError);
            }
        }

        res.status(500).json({
            success: false,
            message: 'Failed to convert quotation',
            error: error.message,
            details: error.errors || error.original || null
        });
    }
};

exports.updateQuotationStatus = async (req, res) => {
    let transaction;
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }

        const normalizedStatus = normalizeQuotationStatus(status);
        if (!VALID_QUOTATION_STATUSES.includes(normalizedStatus)) {
            return res.status(400).json({
                message: `Invalid status. Valid statuses are: ${VALID_QUOTATION_STATUSES.join(', ')}`
            });
        }

        transaction = await sequelize.transaction();

        const quotation = await Quotation.findOne({
            where: { id },
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!quotation) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Quotation not found' });
        }

        await quotation.update({ status: normalizedStatus }, { transaction });
        await transaction.commit();

        const updatedQuotation = await Quotation.findByPk(id, {
            include: [
                { model: QuotationItem, as: 'items', include: [{ model: Product, as: 'product' }] },
                { model: Customer, as: 'customer' },
                { model: User, as: 'creator', attributes: ['id', 'username', 'name'] }
            ]
        });

        res.json({
            success: true,
            message: 'Quotation status updated successfully',
            data: updatedQuotation
        });
    } catch (error) {
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error('Error rolling back quotation status update:', rollbackError);
            }
        }
        console.error('Error updating quotation status:', {
            quotationId: req.params?.id,
            status: req.body?.status,
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ message: 'Failed to update quotation status', error: error.message });
    }
};
