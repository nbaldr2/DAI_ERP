const { User } = require('../models');
const { generateToken } = require('../middlewares/auth');
const { validationResult } = require('express-validator');

class AuthController {
  /**
   * User login
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { username, password } = req.body;

      // Find user by username
      const user = await User.findOne({ where: { username } });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password'
        });
      }

      // Validate password
      const isValidPassword = await user.validatePassword(password);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password'
        });
      }

      // Generate JWT token
      const token = generateToken(user);

      // Return user data without password
      const userData = user.toSafeObject();

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: userData
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  }

  /**
   * User registration (Admin only)
   * POST /api/auth/register
   */
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { username, password, name, role } = req.body;

      // Check if username already exists
      const existingUser = await User.findOne({ where: { username } });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }

      // Create new user
      const user = await User.create({
        username,
        password_hash: password, // Will be hashed by model hook
        name,
        role: role || 'VIEWER'
      });

      // Return user data without password
      const userData = user.toSafeObject();

      return res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          user: userData
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }
  }

  /**
   * Get current user info
   * GET /api/auth/me
   */
  async getCurrentUser(req, res) {
    try {
      // User is attached to request by auth middleware
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }

      const userData = user.toSafeObject();

      return res.status(200).json({
        success: true,
        data: {
          user: userData
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get user info',
        error: error.message
      });
    }
  }

  /**
   * Change password
   * POST /api/auth/change-password
   */
  async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;
      const user = req.user;

      // Validate current password
      const isValidPassword = await user.validatePassword(currentPassword);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password
      user.password_hash = newPassword; // Will be hashed by model hook
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: error.message
      });
    }
  }

  /**
   * Logout (client-side token removal)
   * POST /api/auth/logout
   */
  async logout(req, res) {
    try {
      // JWT is stateless, so logout is handled client-side
      // This endpoint can be used for logging or cleanup
      return res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: error.message
      });
    }
  }
}

module.exports = new AuthController();
