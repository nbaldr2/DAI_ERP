const { Op } = require('sequelize');
const { Expense, Supplier, User, AuditLog } = require('../models');

// List expenses with filters and pagination
exports.listExpenses = async (req, res) => {
  try {
    const {
      category,
      supplier_id,
      status,
      date_from,
      date_to,
      search,
      page = 1,
      limit = 50
    } = req.query;

    const where = {};

    if (category) where.category = category;
    if (supplier_id) where.supplier_id = supplier_id;
    if (status) where.status = status;

    if (date_from || date_to) {
      where.expense_date = {};
      if (date_from) where.expense_date[Op.gte] = date_from;
      if (date_to) where.expense_date[Op.lte] = date_to;
    }

    if (search) {
      where[Op.or] = [
        { description: { [Op.like]: `%${search}%` } },
        { category: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Expense.findAndCountAll({
      where,
      include: [
        { model: Supplier, as: 'supplier', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'username', 'name'] }
      ],
      order: [['expense_date', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error listing expenses:', error);
    res.status(500).json({ success: false, message: 'Failed to list expenses', error: error.message });
  }
};

// Get single expense by ID
exports.getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findByPk(id, {
      include: [
        { model: Supplier, as: 'supplier', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'username', 'name'] }
      ]
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    res.status(200).json({ success: true, data: expense });
  } catch (error) {
    console.error('Error getting expense:', error);
    res.status(500).json({ success: false, message: 'Failed to get expense', error: error.message });
  }
};

// Create a new expense
exports.createExpense = async (req, res) => {
  try {
    const {
      expense_date,
      category,
      description,
      amount,
      currency = 'QAR',
      payment_method = 'CASH',
      supplier_id,
      reference_type,
      reference_id,
      status = 'APPROVED',
      notes
    } = req.body;

    if (!expense_date || !category || !amount) {
      return res.status(400).json({ success: false, message: 'expense_date, category, and amount are required' });
    }

    const created_by = req.user?.id || req.userId;

    const expense = await Expense.create({
      expense_date,
      category,
      description,
      amount,
      currency,
      payment_method,
      supplier_id: supplier_id || null,
      reference_type: reference_type || null,
      reference_id: reference_id || null,
      status,
      notes: notes || null,
      created_by
    });

    // Audit log
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    await AuditLog.logChange({
      entity_type: 'expense',
      entity_id: expense.id,
      action: 'CREATE',
      old_value: null,
      new_value: expense.toJSON(),
      performed_by: created_by,
      ip_address: ipAddress,
      user_agent: userAgent,
      notes: 'Expense created'
    });

    const fullExpense = await Expense.findByPk(expense.id, {
      include: [
        { model: Supplier, as: 'supplier', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'username', 'name'] }
      ]
    });

    res.status(201).json({ success: true, message: 'Expense created successfully', data: fullExpense });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ success: false, message: 'Failed to create expense', error: error.message });
  }
};

// Update an expense
exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByPk(id);

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const oldValue = expense.toJSON();

    const {
      expense_date,
      category,
      description,
      amount,
      currency,
      payment_method,
      supplier_id,
      reference_type,
      reference_id,
      status,
      notes
    } = req.body;

    await expense.update({
      expense_date: expense_date ?? expense.expense_date,
      category: category ?? expense.category,
      description: description ?? expense.description,
      amount: amount ?? expense.amount,
      currency: currency ?? expense.currency,
      payment_method: payment_method ?? expense.payment_method,
      supplier_id: supplier_id ?? expense.supplier_id,
      reference_type: reference_type ?? expense.reference_type,
      reference_id: reference_id ?? expense.reference_id,
      status: status ?? expense.status,
      notes: notes ?? expense.notes,
      updated_at: new Date()
    });

    // Audit log
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    await AuditLog.logChange({
      entity_type: 'expense',
      entity_id: expense.id,
      action: 'UPDATE',
      old_value: oldValue,
      new_value: expense.toJSON(),
      performed_by: req.user?.id || req.userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      notes: 'Expense updated'
    });

    const fullExpense = await Expense.findByPk(expense.id, {
      include: [
        { model: Supplier, as: 'supplier', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'username', 'name'] }
      ]
    });

    res.status(200).json({ success: true, message: 'Expense updated successfully', data: fullExpense });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ success: false, message: 'Failed to update expense', error: error.message });
  }
};

// Delete (soft) an expense
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByPk(id);

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const oldValue = expense.toJSON();
    await expense.destroy();

    // Audit log
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    await AuditLog.logChange({
      entity_type: 'expense',
      entity_id: id,
      action: 'DELETE',
      old_value: oldValue,
      new_value: null,
      performed_by: req.user?.id || req.userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      notes: 'Expense deleted'
    });

    res.status(200).json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ success: false, message: 'Failed to delete expense', error: error.message });
  }
};