const express = require("express");
const router = express.Router();

const {
  getSubscription,
  upgradeSubscription,
  verifyPaymentAndUpgrade,
  getPaymentHistory,
  cancelSubscription,
  getSubscriptionPlans,
} = require("../controllers/subscriptionController");

const { authenticate } = require("../middleware/auth");
const { requireAdmin, requireMember } = require("../middleware/rolePermission");
const {
  ensureTenantIsolation,
  checkAccountStatus,
  validateTenantSlug,
} = require("../middleware/tenant");
const {
  checkUpgradeEligibility,
  attachSubscriptionInfo,
} = require("../middleware/subscriptionLimit");

/**
 * Public Routes
 */

// Get available subscription plans
router.get("/plans", getSubscriptionPlans);

/**
 * Protected Routes
 */

// Get current subscription details
router.get(
  "/",
  authenticate,
  ensureTenantIsolation,
  checkAccountStatus,
  requireMember,
  attachSubscriptionInfo,
  getSubscription
);

// Upgrade tenant subscription (Admin only)
router.post(
  "/tenants/:slug/upgrade",
  authenticate,
  validateTenantSlug,
  checkAccountStatus,
  requireAdmin,
  checkUpgradeEligibility,
  upgradeSubscription
);

// Verify payment and complete upgrade
router.post(
  "/verify-payment",
  authenticate,
  ensureTenantIsolation,
  checkAccountStatus,
  requireAdmin,
  verifyPaymentAndUpgrade
);

// Get payment history
router.get(
  "/payments",
  authenticate,
  ensureTenantIsolation,
  checkAccountStatus,
  requireMember,
  getPaymentHistory
);

// Cancel subscription (Admin only)
router.post(
  "/cancel",
  authenticate,
  ensureTenantIsolation,
  checkAccountStatus,
  requireAdmin,
  cancelSubscription
);

module.exports = router;
