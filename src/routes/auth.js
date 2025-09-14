const express = require("express");
const router = express.Router();

const {
  register,
  login,
  getProfile,
  inviteUser,
  changePassword,
  logout,
} = require("../controllers/authController");

const { authenticate } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/rolePermission");
const {
  ensureTenantIsolation,
  checkAccountStatus,
} = require("../middleware/tenant");

/**
 * Public Routes
 */

// Register new account with admin user
router.post("/register", register);

// Login user
router.post("/login", login);

/**
 * Protected Routes
 */

// Get current user profile
router.get(
  "/profile",
  authenticate,
  ensureTenantIsolation,
  checkAccountStatus,
  getProfile
);

// Invite user to account (Admin only)
router.post(
  "/invite",
  authenticate,
  ensureTenantIsolation,
  checkAccountStatus,
  requireAdmin,
  inviteUser
);

// Change password
router.post(
  "/change-password",
  authenticate,
  ensureTenantIsolation,
  checkAccountStatus,
  changePassword
);

// Logout user
router.post("/logout", authenticate, logout);

module.exports = router;
