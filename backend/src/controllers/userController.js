const { User } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

class UserController {
  // GET /api/users
  async list(req, res) {
    try {
      const { search, page = 1, limit = 50 } = req.query;

      const where = {};
      if (search) {
        where[Op.or] = [
          { username: { [Op.like]: `%${search}%` } },
          { name: { [Op.like]: `%${search}%` } }
        ];
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const { count, rows } = await User.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [['id', 'ASC']],
        attributes: ['id', 'username', 'name', 'role', 'created_at']
      });

      return res.json({
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
      console.error('List users error:', error);
      return res.status(500).json({ success: false, message: 'Failed to list users', error: error.message });
    }
  }

  // POST /api/users
  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }

      const { username, password, name, role } = req.body;

      const existing = await User.findOne({ where: { username } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Username already exists' });
      }

      const user = await User.create({
        username,
        password_hash: password, // hashed by model hook
        name,
        role: role || 'VIEWER'
      });

      return res.status(201).json({ success: true, message: 'User created successfully', data: user.toSafeObject() });
    } catch (error) {
      console.error('Create user error:', error);
      return res.status(500).json({ success: false, message: 'Failed to create user', error: error.message });
    }
  }

  // PUT /api/users/:id
  async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }

      const { id } = req.params;
      const { username, name, role, password } = req.body;

      const user = await User.findByPk(id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      // Check for username conflict
      if (username && username !== user.username) {
        const existing = await User.findOne({ where: { username } });
        if (existing) {
          return res.status(409).json({ success: false, message: 'Username already exists' });
        }
        user.username = username;
      }

      if (name) user.name = name;
      if (role) user.role = role;
      if (password) user.password_hash = password; // hashed by hook

      await user.save();

      return res.json({ success: true, message: 'User updated successfully', data: user.toSafeObject() });
    } catch (error) {
      console.error('Update user error:', error);
      return res.status(500).json({ success: false, message: 'Failed to update user', error: error.message });
    }
  }

  // DELETE /api/users/:id
  async remove(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      await user.destroy();
      return res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      return res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message });
    }
  }
}

module.exports = new UserController();