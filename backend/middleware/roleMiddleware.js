/**
 * Role Middleware
 * Restricts access based on user roles
 */

/**
 * Check if user has required role
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {Function} - Express middleware function
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user exists (set by auth middleware)
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }

      // Check if user has required role
      const userRole = req.user.role || 'user';
      
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to access this resource'
        });
      }

      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify permissions'
      });
    }
  };
};

/**
 * Require admin role
 */
const requireAdmin = (req, res, next) => {
  return requireRole(['admin', 'superadmin'])(req, res, next);
};

/**
 * Require super admin role
 */
const requireSuperAdmin = (req, res, next) => {
  return requireRole(['superadmin'])(req, res, next);
};

/**
 * Check if user is accessing their own resource or is admin
 * @param {string} userIdParam - Parameter name for user ID (default: 'id')
 * @returns {Function} - Express middleware function
 */
const requireOwnerOrAdmin = (userIdParam = 'id') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      const userRole = req.user.role || 'user';
      const resourceUserId = req.params[userIdParam];
      const currentUserId = req.user.id;

      // Allow if admin or accessing own resource
      if (userRole === 'admin' || userRole === 'superadmin' || resourceUserId === currentUserId) {
        return next();
      }

      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own resources'
      });
    } catch (error) {
      console.error('Owner/admin check error:', error);
      return res.status(500).json({
        error: 'Internal server error'
      });
    }
  };
};

/**
 * Optional role check - doesn't block but adds role info
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {Function} - Express middleware function
 */
const optionalRole = (allowedRoles) => {
  return (req, res, next) => {
    if (req.user) {
      const userRole = req.user.role || 'user';
      req.hasRole = allowedRoles.includes(userRole);
    } else {
      req.hasRole = false;
    }
    next();
  };
};

/**
 * Check if admin can perform sensitive action (requires password re-verification)
 * @param {Function} verifyPassword - Function to verify password
 * @returns {Function} - Express middleware function
 */
const requirePasswordVerification = (verifyPassword) => {
  return async (req, res, next) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({
          error: 'Password required',
          message: 'Please provide your password to perform this action'
        });
      }

      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      // Verify password
      const isValid = await verifyPassword(req.user.id, password);
      
      if (!isValid) {
        return res.status(401).json({
          error: 'Invalid password',
          message: 'The password you entered is incorrect'
        });
      }

      // Mark as password verified for this request
      req.passwordVerified = true;
      next();
    } catch (error) {
      console.error('Password verification error:', error);
      return res.status(500).json({
        error: 'Verification failed'
      });
    }
  };
};

module.exports = {
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  requireOwnerOrAdmin,
  optionalRole,
  requirePasswordVerification
};
