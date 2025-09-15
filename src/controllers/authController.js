const passport = require("passport");
const User = require("../models/User");
const Account = require("../models/Account");
const Role = require("../models/Role");
const {
  generateToken,
  comparePassword,
  generateSlug,
  generateRandomString,
  sendResponse,
  sendError,
} = require("../utils/helpers");
const { ROLES, SUBSCRIPTION_PLANS } = require("../utils/constants");

/**
 * Register new account with admin user
 * POST /auth/register
 */
const register = async (req, res) => {
  try {
    const { email, password, name, accountName } = req.body;

    // Validate required fields
    if (!email || !password || !name || !accountName) {
      return sendError(res, 400, "All fields are required");
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
      isDeleted: false,
    });

    if (existingUser) {
      return sendError(res, 409, "User with this email already exists");
    }

    // Generate unique account slug
    let baseSlug = generateSlug(accountName);
    let slug = baseSlug;
    let counter = 1;

    while (await Account.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create account
    const account = new Account({
      slug,
      plan: SUBSCRIPTION_PLANS.FREE,
      limit: 3,
      noteCount: 0,
    });

    await account.save();

    // Create admin role for this account
    const adminRole = new Role({
      account: account._id,
      roleName: ROLES.ADMIN,
    });

    await adminRole.save();

    // Create admin user
    const user = new User({
      account: account._id,
      email: email.toLowerCase(),
      password, // Will be hashed by pre-save middleware
      name,
      role: adminRole._id,
    });

    await user.save();

    sendResponse(res, 201, true, "Account created successfully");
  } catch (error) {
    console.error("Registration error:", error);
    sendError(res, 500, "Registration failed");
  }
};

/**
 * Login user
 * POST /auth/login
 */
const login = async (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    try {
      if (err) {
        console.error("Login authentication error:", err);
        return sendError(res, 500, "Authentication failed");
      }

      if (!user) {
        return sendError(res, 401, info?.message || "Invalid credentials");
      }

      // Update last login and IP
      user.lastLogin = new Date();
      user.lastIP = req.ip || req.connection.remoteAddress;
      await user.save();

      // Generate JWT token
      const token = generateToken({
        userId: user._id,
        accountId: user.account._id,
        role: user.role.roleName,
      });

      // Remove password from response
      const userResponse = user.toJSON();

      sendResponse(res, 200, true, "Login successful", {
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      sendError(res, 500, "Login failed");
    }
  })(req, res, next);
};

/**
 * Get current user profile
 * GET /auth/profile
 */
const getProfile = async (req, res) => {
  try {
    const user = req.user;

    const data = {
      user: {
        user_id: user._id,
        name: user.name,
        email_id: user.email,
        is_active: user.is_active,
        role: user.role.roleName,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login: user.lastLogin,
      },
      account: {
        account_id: user.account._id,
        slug: user.account.slug,
        plan: user.account.plan,
        limit: user.account.limit,
        note_count: user.account.noteCount,
        current_subscription: user.account.currentSubscription,
        account_active: user.account.isActive,
        created_at: user.account.createdAt,
        updated_at: user.account.updatedAt,
      },
    };

    sendResponse(res, 200, true, "Profile retrieved successfully", data);
  } catch (error) {
    console.error("Get profile error:", error);
    sendError(res, 500, "Failed to get profile");
  }
};

/**
 * Invite user to account (Admin only)
 * POST /auth/invite
 */
const inviteUser = async (req, res) => {
  try {
    const { email, name, role = ROLES.MEMBER } = req.body;
    const adminUser = req.user;

    // Validate required fields
    if (!email || !name) {
      return sendError(res, 400, "Email and name are required");
    }

    // Validate role
    if (!Object.values(ROLES).includes(role)) {
      return sendError(res, 400, "Invalid role");
    }

    // Check if user already exists in this account
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
      account: adminUser.account._id,
      isDeleted: false,
    });

    if (existingUser) {
      return sendError(res, 409, "User already exists in this account");
    }

    // Find or create role
    let userRole = await Role.findOne({
      account: adminUser.account._id,
      roleName: role,
    });

    if (!userRole) {
      userRole = new Role({
        account: adminUser.account._id,
        roleName: role,
      });
      await userRole.save();
    }

    // Generate temporary password
    const tempPassword = generateRandomString(12);

    // Create user
    const newUser = new User({
      account: adminUser.account._id,
      email: email.toLowerCase(),
      password: tempPassword, // Will be hashed by pre-save middleware
      name,
      isActive: false,
      role: userRole._id,
    });

    await newUser.save();

    // I need to implement mailing service to notify user on their email

    const userResponse = newUser.toJSON();

    sendResponse(res, 201, true, "User invited successfully", {
      email: userResponse.email,
      tempPassword, // I will remove this later and send it via email
      message: "User should change password on first login",
    });
  } catch (error) {
    console.error("Invite user error:", error);
    sendError(res, 500, "Failed to invite user");
  }
};

/**
 * Change password
 * POST /auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return sendError(
        res,
        400,
        "Current password and new password are required"
      );
    }

    // Verify current password
    const isValidPassword = await comparePassword(
      currentPassword,
      user.password
    );
    if (!isValidPassword) {
      return sendError(res, 400, "Current password is incorrect");
    }

    const isSameAsOld = await comparePassword(newPassword, user.password);
    if (isSameAsOld) {
      return sendError(
        res,
        400,
        "New password cannot be the same as the old password"
      );
    }

    // Update password
    user.password = newPassword; // Will be hashed by pre-save middleware
    user.tokensInvalidBefore = new Date(); // Invalidate all existing tokens
    await user.save();

    sendResponse(res, 200, true, "Password changed successfully");
  } catch (error) {
    console.error("Change password error:", error);
    sendError(res, 500, "Failed to change password");
  }
};

/**
 * Logout user (invalidate tokens)
 * POST /auth/logout
 */
const logout = async (req, res) => {
  try {
    const user = req.user;

    // Invalidate all tokens for this user
    user.tokensInvalidBefore = new Date();
    await user.save();

    sendResponse(res, 200, true, "Logged out successfully");
  } catch (error) {
    console.error("Logout error:", error);
    sendError(res, 500, "Logout failed");
  }
};

module.exports = {
  register,
  login,
  getProfile,
  inviteUser,
  changePassword,
  logout,
};
