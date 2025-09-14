const Account = require("../models/Account");
const { sendError } = require("../utils/helpers");

/**
 * Middleware to validate tenant slug from URL parameters
 * Used for routes like /tenants/:slug/upgrade
 */
const validateTenantSlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return sendError(res, 400, "Tenant slug is required");
    }

    // Find account by slug
    const account = await Account.findOne({
      slug: slug.toLowerCase(),
      isActive: true,
      isDeleted: false,
    });

    if (!account) {
      return sendError(res, 404, "Tenant not found");
    }

    // Check if authenticated user belongs to this tenant
    if (
      req.user &&
      req.user.account._id.toString() !== account._id.toString()
    ) {
      return sendError(
        res,
        403,
        "Access denied - you do not belong to this tenant"
      );
    }

    // Attach tenant account to request
    req.tenant = account;

    next();
  } catch (error) {
    console.error("Tenant validation error:", error);
    return sendError(res, 500, "Tenant validation failed");
  }
};

/**
 * Middleware to ensure tenant isolation
 * Automatically filters queries by authenticated user's account
 */
const ensureTenantIsolation = (req, res, next) => {
  if (!req.user || !req.user.account) {
    return sendError(res, 401, "Authentication required for tenant isolation");
  }

  // Add tenant filter to request for use in controllers
  req.tenantFilter = {
    account: req.user.account._id,
  };

  next();
};

/**
 * Middleware to check if account can perform actions (not suspended, etc.)
 */
const checkAccountStatus = async (req, res, next) => {
  try {
    if (!req.account && !req.tenant) {
      return sendError(res, 400, "Account context required");
    }

    const account = req.account || req.tenant;

    if (!account.isActive) {
      return sendError(res, 403, "Account is suspended");
    }

    if (account.isDeleted) {
      return sendError(res, 403, "Account has been deleted");
    }

    next();
  } catch (error) {
    console.error("Account status check error:", error);
    return sendError(res, 500, "Account status check failed");
  }
};

module.exports = {
  validateTenantSlug,
  ensureTenantIsolation,
  checkAccountStatus,
};
