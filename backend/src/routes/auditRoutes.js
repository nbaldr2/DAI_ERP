const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middlewares/auth');
const { AuditLog, User } = require('../models');
const { Op } = require('sequelize');

/**
 * @route   GET /api/audit-logs
 * @desc    List all audit logs with filters
 * @access  Private (Admin, Accountant)
 */
router.get('/',
  authenticateToken,
  authorize('ADMIN', 'ACCOUNTANT'),
  async (req, res) => {
    try {
      const {
        entity_type,
        entity_id,
        action,
        performed_by,
        date_from,
        date_to,
        page = 1,
        limit = 50
      } = req.query;

      const where = {};

      if (entity_type) where.entity_type = entity_type;
      if (entity_id) where.entity_id = entity_id;
      if (action) where.action = action;
      if (performed_by) where.performed_by = performed_by;

      if (date_from || date_to) {
        where.performed_at = {};
        if (date_from) where.performed_at[Op.gte] = date_from;
        if (date_to) where.performed_at[Op.lte] = date_to;
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows } = await AuditLog.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'performer',
            attributes: ['id', 'username', 'name', 'role']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [['performed_at', 'DESC']]
      });

      res.json({
        success: true,
        data: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('List audit logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list audit logs',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/audit-logs/:id
 * @desc    Get audit log by ID
 * @access  Private (Admin, Accountant)
 */
router.get('/:id',
  authenticateToken,
  authorize('ADMIN', 'ACCOUNTANT'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const auditLog = await AuditLog.findByPk(id, {
        include: [
          {
            model: User,
            as: 'performer',
            attributes: ['id', 'username', 'name', 'role']
          }
        ]
      });

      if (!auditLog) {
        return res.status(404).json({
          success: false,
          message: 'Audit log not found'
        });
      }

      res.json({
        success: true,
        data: auditLog
      });
    } catch (error) {
      console.error('Get audit log error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get audit log',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/audit-logs/entity/:entity_type/:entity_id
 * @desc    Get audit trail for a specific entity
 * @access  Private
 */
router.get('/entity/:entity_type/:entity_id',
  authenticateToken,
  async (req, res) => {
    try {
      const { entity_type, entity_id } = req.params;
      const { limit = 50 } = req.query;

      const auditTrail = await AuditLog.findAll({
        where: {
          entity_type,
          entity_id: parseInt(entity_id)
        },
        include: [
          {
            model: User,
            as: 'performer',
            attributes: ['id', 'username', 'name', 'role']
          }
        ],
        limit: parseInt(limit),
        order: [['performed_at', 'DESC']]
      });

      res.json({
        success: true,
        data: auditTrail,
        meta: {
          entity_type,
          entity_id: parseInt(entity_id),
          count: auditTrail.length
        }
      });
    } catch (error) {
      console.error('Get audit trail error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get audit trail',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/audit-logs/user/:user_id/activity
 * @desc    Get activity log for a specific user
 * @access  Private (Admin, Accountant)
 */
router.get('/user/:user_id/activity',
  authenticateToken,
  authorize('ADMIN', 'ACCOUNTANT'),
  async (req, res) => {
    try {
      const { user_id } = req.params;
      const { page = 1, limit = 50, date_from, date_to } = req.query;

      const where = {
        performed_by: parseInt(user_id)
      };

      if (date_from || date_to) {
        where.performed_at = {};
        if (date_from) where.performed_at[Op.gte] = date_from;
        if (date_to) where.performed_at[Op.lte] = date_to;
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows } = await AuditLog.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'performer',
            attributes: ['id', 'username', 'name', 'role']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [['performed_at', 'DESC']]
      });

      res.json({
        success: true,
        data: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Get user activity error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user activity',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/audit-logs/summary/statistics
 * @desc    Get audit log statistics
 * @access  Private (Admin)
 */
router.get('/summary/statistics',
  authenticateToken,
  authorize('ADMIN'),
  async (req, res) => {
    try {
      const { sequelize } = require('../config/database');
      const { date_from, date_to } = req.query;

      const where = {};
      if (date_from || date_to) {
        where.performed_at = {};
        if (date_from) where.performed_at[Op.gte] = date_from;
        if (date_to) where.performed_at[Op.lte] = date_to;
      }

      // Get action statistics
      const actionStats = await AuditLog.findAll({
        where,
        attributes: [
          'action',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['action'],
        raw: true
      });

      // Get entity type statistics
      const entityStats = await AuditLog.findAll({
        where,
        attributes: [
          'entity_type',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['entity_type'],
        raw: true
      });

      // Get most active users
      const userStats = await AuditLog.findAll({
        where,
        attributes: [
          'performed_by',
          [sequelize.fn('COUNT', sequelize.col('AuditLog.id')), 'activity_count']
        ],
        include: [
          {
            model: User,
            as: 'performer',
            attributes: ['id', 'username', 'name', 'role']
          }
        ],
        group: ['performed_by'],
        order: [[sequelize.literal('activity_count'), 'DESC']],
        limit: 10,
        raw: false
      });

      res.json({
        success: true,
        data: {
          by_action: actionStats,
          by_entity_type: entityStats,
          most_active_users: userStats,
          period: {
            from: date_from || 'all time',
            to: date_to || 'now'
          }
        }
      });
    } catch (error) {
      console.error('Get audit statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get audit statistics',
        error: error.message
      });
    }
  }
);

module.exports = router;
