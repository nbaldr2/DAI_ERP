const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');

    // Get user from database
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;
    req.userRole = user.role;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

// Role-based authorization middleware
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
      const user = await User.findByPk(decoded.userId);

      if (user) {
        req.user = user;
        req.userId = user.id;
        req.userRole = user.role;
      }
    }
  } catch (error) {
    // Silently fail for optional auth
  }

  next();
};

// Generate JWT token
const generateToken = (user) => {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'supersecretkey', {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

// Verify if user has specific permission
const hasPermission = (user, action, resource) => {
  const permissions = {
    ADMIN: ['*'], // Admin has all permissions
    WAREHOUSE: ['stock:read', 'stock:create', 'stock:update', 'waste:create', 'waste:read', 'purchases:read', 'purchases:create', 'purchases:update', 'expenses:read', 'expenses:create'],
    SALES: ['stock:read', 'sales:create', 'sales:read', 'sales:update', 'customer:read', 'customer:create', 'invoice:create', 'expenses:read', 'expenses:create'],
    ACCOUNTANT: ['*:read', 'invoice:create', 'invoice:update', 'payment:create', 'accounting:*', 'purchases:read', 'purchases:create', 'purchases:update', 'expenses:*'],
    VIEWER: ['*:read']
  };

  const userPermissions = permissions[user.role] || [];

  // Admin has all permissions
  if (userPermissions.includes('*')) {
    return true;
  }

  // Check specific permission
  const permission = `${resource}:${action}`;
  if (userPermissions.includes(permission)) {
    return true;
  }

  // Check wildcard permissions
  if (userPermissions.includes(`${resource}:*`)) {
    return true;
  }

  if (userPermissions.includes(`*:${action}`)) {
    return true;
  }

  return false;
};

// Permission middleware
const checkPermission = (action, resource) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!hasPermission(req.user, action, resource)) {
      return res.status(403).json({
        success: false,
        message: `Permission denied. You don't have ${resource}:${action} permission`
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorize,
  optionalAuth,
  generateToken,
  hasPermission,
  checkPermission
};
