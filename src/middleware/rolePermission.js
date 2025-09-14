const { ROLES, PERMISSIONS } = require("../utils/constants");
const { sendError } = require("../utils/helpers");

/**
 * Middleware to check if user has required role
 */
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return sendError(res, 401, "Authentication required");
    }

    const userRole = req.user.role.roleName;

    if (userRole !== requiredRole) {
      return sendError(
        res,
        403,
        `Access denied - ${requiredRole} role required`
      );
    }

    next();
  };
};

/**
 * Middleware to check if user has required permission
 */
const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return sendError(res, 401, "Authentication required");
    }

    const userRole = req.user.role.roleName;
    const userPermissions = PERMISSIONS[userRole] || [];

    if (!userPermissions.includes(requiredPermission)) {
      return sendError(res, 403, "Insufficient permissions");
    }

    next();
  };
};

/**
 * Middleware to check if user has any of the required permissions
 */
const requireAnyPermission = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return sendError(res, 401, "Authentication required");
    }

    const userRole = req.user.role.roleName;
    const userPermissions = PERMISSIONS[userRole] || [];

    const hasPermission = requiredPermissions.some((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return sendError(res, 403, "Insufficient permissions");
    }

    next();
  };
};

/**
 * Middleware to ensure user is admin
 */
const requireAdmin = requireRole(ROLES.ADMIN);

/**
 * Middleware to ensure user is member or admin
 */
const requireMember = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return sendError(res, 401, "Authentication required");
  }

  const userRole = req.user.role.roleName;

  if (![ROLES.ADMIN, ROLES.MEMBER].includes(userRole)) {
    return sendError(res, 403, "Access denied - member access required");
  }

  next();
};

/**
 * Middleware to check resource ownership or admin access
 * Used for scenarios where users can only access their own resources
 * unless they are admin
 */
const requireOwnershipOrAdmin = (resourceUserIdField = "user") => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return sendError(res, 401, "Authentication required");
    }

    const userRole = req.user.role.roleName;

    // Admin can access everything
    if (userRole === ROLES.ADMIN) {
      return next();
    }

    // For non-admin users, add ownership filter
    if (!req.tenantFilter) {
      req.tenantFilter = {};
    }

    req.tenantFilter[resourceUserIdField] = req.user._id;

    next();
  };
};

module.exports = {
  requireRole,
  requirePermission,
  requireAnyPermission,
  requireAdmin,
  requireMember,
  requireOwnershipOrAdmin,
};
