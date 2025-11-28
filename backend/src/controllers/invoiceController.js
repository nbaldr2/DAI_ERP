const Invoice = require('../models/Invoice');
const InvoiceItem = require('../models/InvoiceItem');
const InvoicePayment = require('../models/InvoicePayment');
const InvoiceAttachment = require('../models/InvoiceAttachment');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const User = require('../models/User');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const moment = require('moment');

/**
 * Get next invoice number
 */
exports.getNextInvoiceNumber = async (req, res) => {
  try {
    // Find the highest invoice number
    const lastInvoice = await Invoice.findOne({
      where: {
        invoice_number: {
          [Op.like]: 'INV-%'
        }
      },
      order: [['invoice_number', 'DESC']]
    });
    
    let nextNumber = 250001; // Default starting number
    
    if (lastInvoice) {
      // Extract the numeric part from invoice_number (e.g., "INV-250001" -> 250001)
      const lastNumber = parseInt(lastInvoice.invoice_number.replace('INV-', ''));
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
    
    const formattedNextNumber = `INV-${nextNumber.toString().padStart(6, '0')}`;
    
    res.json({ 
      success: true,
      data: {
        next_invoice_number: formattedNextNumber,
        next_number: nextNumber
      }
    });
  } catch (error) {
    console.error('Error getting next invoice number:', error);
    res.status(500).json({ message: 'Failed to get next invoice number', error: error.message });
  }
};

/**
 * Get all invoices with pagination
 */
exports.getAllInvoices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status || null;
    
    const whereClause = { deleted_at: null };
    if (status) {
      whereClause.status = status;
    }
    
    const { count, rows } = await Invoice.findAndCountAll({
      where: whereClause,
      include: [
        { model: Customer, attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'name', 'username'] }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
      distinct: true
    });
    
    res.json({
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      data: rows
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ message: 'Failed to fetch invoices', error: error.message });
  }
};

/**
 * Get invoice by ID
 */
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, deleted_at: null },
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'contact', 'address'] },
        { model: User, as: 'creator', attributes: ['id', 'name', 'username'] },
        {
          model: InvoiceItem,
          as: 'items',
          include: [
            { model: Product, as: 'product', attributes: ['id', 'name_en', 'name_ar', 'unit', 'category', 'origin'] }
          ]
        },
        { model: InvoicePayment, as: 'payments' },
        { model: InvoiceAttachment, as: 'attachments' }
      ]
    });
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ message: 'Failed to fetch invoice', error: error.message });
  }
};

/**
 * Create a new invoice
 */
exports.createInvoice = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      invoice_number,
      reference,
      customer_id,
      invoice_date,
      due_date,
      payment_mode,
      currency,
      sale_agent,
      discount_type,
      discount_value,
      subtotal,
      total_discount,
      total,
      status,
      admin_note,
      client_note,
      terms,
      items,
      payments = [],
      attachments = []
    } = req.body;
    
    // Validate required fields
    if (!customer_id || !invoice_date || !due_date || !items || !items.length) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Create invoice
    const invoice = await Invoice.create({
      invoice_number,
      reference,
      customer_id,
      invoice_date,
      due_date,
      payment_mode,
      currency,
      sale_agent,
      discount_type: discount_type || 'none',
      discount_value: discount_value || 0,
      subtotal,
      total_discount,
      total,
      status: status || 'DRAFT',
      admin_note,
      client_note,
      terms,
      created_by: req.user.id
    }, { transaction });
    
    // Create invoice items
    const invoiceItems = await Promise.all(
      items.map(item => {
        return InvoiceItem.create({
          invoice_id: invoice.id,
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          discount: item.discount || 0,
          amount: item.amount
        }, { transaction });
      })
    );

    // Create invoice payments if provided
    let createdPayments = [];
    if (Array.isArray(payments) && payments.length > 0) {
      createdPayments = await Promise.all(
        payments.map(p => {
          return InvoicePayment.create({
            invoice_id: invoice.id,
            amount: p.amount,
            payment_date: p.payment_date || invoice_date,
            payment_method: p.payment_method || 'other',
            reference: p.reference,
            notes: p.notes,
            created_by: req.user.id
          }, { transaction });
        })
      );
    }

    // Create invoice attachments if provided
    let createdAttachments = [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      createdAttachments = await Promise.all(
        attachments.map(a => {
          return InvoiceAttachment.create({
            invoice_id: invoice.id,
            file_name: a.file_name,
            file_path: a.file_path,
            file_type: a.file_type,
            file_size: a.file_size,
            uploaded_by: req.user.id,
            uploaded_at: a.uploaded_at || new Date()
          }, { transaction });
        })
      );
    }

    // Optionally update invoice status based on payments
    if (createdPayments.length > 0 && total != null) {
      const paidSum = createdPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      let newStatus = invoice.status;
      if (paidSum >= parseFloat(total)) {
        newStatus = 'PAID';
      } else if (paidSum > 0) {
        newStatus = 'PARTIAL';
      }
      if (newStatus !== invoice.status) {
        await invoice.update({ status: newStatus }, { transaction });
      }
    }
    
    // Update customer balance if payment mode is "Customer Balance"
    console.log('=== Customer Balance Update Process ===');
    console.log('Payment mode:', payment_mode);
    console.log('Invoice total:', total);
    
    if (payment_mode === 'customer_balance') {
      console.log('\n[1] Finding customer:', customer_id);
      const customer = await Customer.findByPk(customer_id, { transaction });
      if (!customer) {
        console.error('Customer not found:', customer_id);
        await transaction.rollback();
        return res.status(404).json({ message: 'Customer not found' });
      }
      console.log('Customer found:', {
        id: customer.id,
        name: customer.name,
        current_balance: customer.balance,
        credit_limit: customer.credit_limit
      });
      
      // Check if customer has enough balance
      const availableBalance = customer.credit_limit - customer.balance;
      console.log('\n[2] Checking available balance:', {
        credit_limit: customer.credit_limit,
        current_balance: customer.balance,
        available_balance: availableBalance,
        invoice_total: total
      });
      
      if (availableBalance < total) {
        console.error('Insufficient balance:', {
          available: availableBalance,
          required: total,
          shortage: total - availableBalance
        });
        await transaction.rollback();
        return res.status(400).json({ 
          message: 'Insufficient customer balance',
          availableBalance,
          requiredAmount: total
        });
      }
      
      // Update customer balance by adding the invoice total to their current balance
      console.log('\n[3] Updating customer balance:', {
        customer_id: customer.id,
        old_balance: customer.balance,
        amount_to_add: total,
        new_balance: parseFloat(customer.balance) + parseFloat(total)
      });
      
      await customer.update({
        balance: sequelize.literal(`balance + ${total}`)
      }, { transaction });
      
      // Verify the update
      const updatedCustomer = await Customer.findByPk(customer_id, { transaction });
      console.log('\n[4] Balance update verification:', {
        customer_id: updatedCustomer.id,
        old_balance: customer.balance,
        new_balance: updatedCustomer.balance,
        expected_balance: parseFloat(customer.balance) + parseFloat(total),
        update_successful: parseFloat(updatedCustomer.balance) === parseFloat(customer.balance) + parseFloat(total)
      });
    }
    
    await transaction.commit();
    
    res.status(201).json({
      message: 'Invoice created successfully',
      invoice: {
        ...invoice.toJSON(),
        items: invoiceItems.map(item => item.toJSON()),
        payments: createdPayments.map(p => p.toJSON()),
        attachments: createdAttachments.map(a => a.toJSON())
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating invoice:', error);
    res.status(500).json({ message: 'Failed to create invoice', error: error.message });
  }
};

/**
 * Download invoice as PDF
 */
exports.downloadInvoicePdf = async (req, res) => {
  try {
    // Load invoice with related records needed for PDF
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: User, as: 'creator', attributes: ['id', 'name', 'username'] },
        { 
          model: InvoiceItem, 
          as: 'items',
          include: [
            { model: Product, as: 'product', attributes: ['id', 'name_en', 'name_ar', 'unit', 'category', 'origin'] }
          ]
        },
        { model: InvoicePayment, as: 'payments' },
        { model: InvoiceAttachment, as: 'attachments' }
      ]
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Prepare response headers
    const fileName = `invoice-${invoice.invoice_number || invoice.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Create PDF document and stream to response
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.pipe(res);

    // Company Header (static for now, could use env later)
    doc.font('Helvetica-Bold').fontSize(20).text('DAI TRADING', { align: 'left' });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10);
    doc.text('123 Business Street');
    doc.text('Doha, Qatar');
    doc.text('Phone: +974 1234 5678');
    doc.text('Email: info@dai-trading.com');

    // Invoice Title and Meta
    doc.moveDown(1);
    doc.font('Helvetica-Bold').fontSize(16).text('INVOICE', { align: 'right' });
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Invoice Number: ${invoice.invoice_number || 'N/A'}`, { align: 'right' });
    doc.text(`Date: ${invoice.invoice_date ? moment(invoice.invoice_date).format('DD/MM/YYYY') : 'N/A'}`, { align: 'right' });
    doc.text(`Due Date: ${invoice.due_date ? moment(invoice.due_date).format('DD/MM/YYYY') : 'N/A'}`, { align: 'right' });

    // Customer Details
    doc.moveDown(1);
    doc.font('Helvetica-Bold').fontSize(12).text('Bill To');
    doc.font('Helvetica').fontSize(10);
    const customer = invoice.customer || {};
    doc.text(customer.name || '');
    if (customer.address) doc.text(customer.address);
    if (customer.contact) doc.text(customer.contact);

    // Divider
    doc.moveDown(0.5);
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
    doc.moveDown(0.5);

    // Items Table Header
    const tableTop = doc.y;
    const colX = {
      desc: doc.page.margins.left,
      qty: doc.page.margins.left + 280,
      rate: doc.page.margins.left + 340,
      disc: doc.page.margins.left + 400,
      amt: doc.page.margins.left + 470
    };
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Description', colX.desc, tableTop);
    doc.text('Qty', colX.qty, tableTop, { width: 50, align: 'right' });
    doc.text('Rate', colX.rate, tableTop, { width: 50, align: 'right' });
    doc.text('Disc', colX.disc, tableTop, { width: 50, align: 'right' });
    doc.text('Amount', colX.amt, tableTop, { width: 80, align: 'right' });
    doc.moveDown(0.2);
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();

    // Items Rows
    doc.font('Helvetica').fontSize(10);
    let y = doc.y + 4;
    (invoice.items || []).forEach((item) => {
      const qty = parseFloat(item.quantity || 0);
      const rate = parseFloat(item.rate || 0);
      const discount = parseFloat(item.discount || 0);
      const amount = parseFloat(item.amount || (qty * rate - discount));
      const descText = item.description || `Product #${item.product_id}`;

      doc.text(descText, colX.desc, y, { width: 270 });
      doc.text(qty.toFixed(2), colX.qty, y, { width: 50, align: 'right' });
      doc.text(rate.toFixed(2), colX.rate, y, { width: 50, align: 'right' });
      doc.text(discount.toFixed(2), colX.disc, y, { width: 50, align: 'right' });
      doc.text(amount.toFixed(2), colX.amt, y, { width: 80, align: 'right' });
      y += 16;
      if (y > doc.page.height - doc.page.margins.bottom - 120) {
        doc.addPage();
        y = doc.page.margins.top;
      }
    });

    // Totals
    doc.moveDown(1);
    const totalsY = Math.max(y + 8, doc.y);
    doc.font('Helvetica-Bold').fontSize(10);
    const totalsX = doc.page.width - doc.page.margins.right - 200;
    const lineH = 16;
    const writeTotal = (label, value, bold = false) => {
      if (bold) doc.font('Helvetica-Bold'); else doc.font('Helvetica');
      doc.text(label, totalsX, totalsY, { width: 100, align: 'right' });
      doc.text((value != null ? parseFloat(value).toFixed(2) : '0.00'), totalsX + 110, totalsY, { width: 90, align: 'right' });
    };
    writeTotal('Subtotal', invoice.subtotal);
    writeTotal('Discount', invoice.total_discount);
    writeTotal('Total', invoice.total, true);

    // Payments Summary
    const paid = (invoice.payments || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const due = parseFloat(invoice.total || 0) - paid;
    doc.moveDown(0.5);
    writeTotal('Paid', paid);
    writeTotal('Due', due, true);

    // Notes / Terms
    doc.moveDown(1);
    if (invoice.client_note || invoice.admin_note || invoice.terms) {
      doc.font('Helvetica-Bold').fontSize(11).text('Notes & Terms');
      doc.font('Helvetica').fontSize(10);
      if (invoice.client_note) doc.text(`Client: ${invoice.client_note}`);
      if (invoice.admin_note) doc.text(`Admin: ${invoice.admin_note}`);
      if (invoice.terms) doc.text(`Terms: ${invoice.terms}`);
    }

    // Footer
    doc.moveDown(1);
    doc.font('Helvetica').fontSize(9).text('Thank you for your business!', { align: 'center' });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('Download invoice PDF error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF', error: error.message });
  }
};

/**
 * Update an invoice
 */
exports.updateInvoice = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, deleted_at: null }
    });
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    const {
      invoice_number,
      reference,
      customer_id,
      invoice_date,
      due_date,
      payment_mode,
      currency,
      sale_agent,
      discount_type,
      discount_value,
      subtotal,
      total_discount,
      total,
      status,
      admin_note,
      client_note,
      terms,
      items,
      payments = [],
      attachments = []
    } = req.body;
    
    // Update invoice
    await invoice.update({
      invoice_number,
      reference,
      customer_id,
      invoice_date,
      due_date,
      payment_mode,
      currency,
      sale_agent,
      discount_type,
      discount_value,
      subtotal,
      total_discount,
      total,
      status,
      admin_note,
      client_note,
      terms
    }, { transaction });
    
    // Delete existing items
    await InvoiceItem.destroy({
      where: { invoice_id: invoice.id },
      transaction
    });
    
    // Create new items
    const invoiceItems = await Promise.all(
      items.map(item => {
        return InvoiceItem.create({
          invoice_id: invoice.id,
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          discount: item.discount || 0,
          amount: item.amount
        }, { transaction });
      })
    );

    // Replace payments if provided
    await InvoicePayment.destroy({ where: { invoice_id: invoice.id }, transaction });
    let updatedPayments = [];
    if (Array.isArray(payments) && payments.length > 0) {
      updatedPayments = await Promise.all(
        payments.map(p => {
          return InvoicePayment.create({
            invoice_id: invoice.id,
            amount: p.amount,
            payment_date: p.payment_date || invoice_date,
            payment_method: p.payment_method || 'other',
            reference: p.reference,
            notes: p.notes,
            created_by: req.user.id
          }, { transaction });
        })
      );
    }

    // Replace attachments if provided
    await InvoiceAttachment.destroy({ where: { invoice_id: invoice.id }, transaction });
    let updatedAttachments = [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      updatedAttachments = await Promise.all(
        attachments.map(a => {
          return InvoiceAttachment.create({
            invoice_id: invoice.id,
            file_name: a.file_name,
            file_path: a.file_path,
            file_type: a.file_type,
            file_size: a.file_size,
            uploaded_by: req.user.id,
            uploaded_at: a.uploaded_at || new Date()
          }, { transaction });
        })
      );
    }
    
    // Update customer balance if payment mode is "Customer Balance"
    console.log('=== Customer Balance Update Process (Update Invoice) ===');
    console.log('Payment mode:', payment_mode);
    console.log('Invoice total:', total);
    
    if (payment_mode === 'customer_balance') {
      console.log('\n[1] Finding customer:', customer_id);
      const customer = await Customer.findByPk(customer_id, { transaction });
      if (!customer) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Customer not found' });
      }
      
      // Check if customer has enough balance
      const availableBalance = customer.credit_limit - customer.balance;
      console.log('\n[2] Checking available balance:', {
        credit_limit: customer.credit_limit,
        current_balance: customer.balance,
        available_balance: availableBalance,
        invoice_total: total
      });
      
      if (availableBalance < total) {
        console.error('Insufficient balance:', {
          available: availableBalance,
          required: total,
          shortage: total - availableBalance
        });
        await transaction.rollback();
        return res.status(400).json({ 
          message: 'Insufficient customer balance',
          availableBalance,
          requiredAmount: total
        });
      }
      
      // Update customer balance by adding the invoice total to their current balance
      console.log('\n[3] Updating customer balance:', {
        customer_id: customer.id,
        old_balance: customer.balance,
        amount_to_add: total,
        new_balance: parseFloat(customer.balance) + parseFloat(total)
      });
      
      await customer.update({
        balance: sequelize.literal(`balance + ${total}`)
      }, { transaction });
      
      // Verify the update
      const updatedCustomer = await Customer.findByPk(customer_id, { transaction });
      console.log('\n[4] Balance update verification:', {
        customer_id: updatedCustomer.id,
        old_balance: customer.balance,
        new_balance: updatedCustomer.balance,
        expected_balance: parseFloat(customer.balance) + parseFloat(total),
        update_successful: parseFloat(updatedCustomer.balance) === parseFloat(customer.balance) + parseFloat(total)
      });
    }
    
    await transaction.commit();
    
    res.json({
      message: 'Invoice updated successfully',
      invoice: {
        ...invoice.toJSON(),
        items: invoiceItems.map(item => item.toJSON()),
        payments: updatedPayments.map(p => p.toJSON()),
        attachments: updatedAttachments.map(a => a.toJSON())
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating invoice:', error);
    res.status(500).json({ message: 'Failed to update invoice', error: error.message });
  }
};

/**
 * Delete an invoice (soft delete)
 */
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, deleted_at: null }
    });
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    await invoice.update({ deleted_at: new Date() });
    
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ message: 'Failed to delete invoice', error: error.message });
  }
};

/**
 * Get invoice statistics
 */
exports.getInvoiceStats = async (req, res) => {
  try {
    const totalInvoices = await Invoice.count({
      where: { deleted_at: null }
    });
    
    const draftInvoices = await Invoice.count({
      where: { status: 'draft', deleted_at: null }
    });
    
    const paidInvoices = await Invoice.count({
      where: { status: 'paid', deleted_at: null }
    });
    
    const overdueInvoices = await Invoice.count({
      where: { 
        status: 'overdue', 
        deleted_at: null 
      }
    });
    
    const totalAmount = await Invoice.sum('total', {
      where: { deleted_at: null }
    });
    
    res.json({
      totalInvoices,
      draftInvoices,
      paidInvoices,
      overdueInvoices,
      totalAmount: totalAmount || 0
    });
  } catch (error) {
    console.error('Error fetching invoice statistics:', error);
    res.status(500).json({ message: 'Failed to fetch invoice statistics', error: error.message });
  }
};