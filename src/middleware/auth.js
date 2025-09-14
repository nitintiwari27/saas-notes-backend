const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendError } = require("../utils/helpers");

/**
 * Middleware to authenticate user using JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return sendError(res, 401, "Access token required");
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user and populate account and role
    const user = await User.findById(decoded.userId)
      .populate("account")
      .populate("role");

    if (!user || !user.isActive || user.isDeleted) {
      return sendError(res, 401, "Invalid token - user not found or inactive");
    }

    // Check if token was issued before user's token invalidation date
    if (decoded.iat * 1000 < user.tokensInvalidBefore.getTime()) {
      return sendError(res, 401, "Token has been invalidated");
    }

    // Check if account is active
    if (!user.account || !user.account.isActive || user.account.isDeleted) {
      return sendError(res, 401, "Account inactive or not found");
    }

    // Attach user to request
    req.user = user;
    req.account = user.account;

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return sendError(res, 401, "Invalid token format");
    }
    if (error.name === "TokenExpiredError") {
      return sendError(res, 401, "Token has expired");
    }

    console.error("Authentication error:", error);
    return sendError(res, 500, "Authentication failed");
  }
};

/**
 * Extract token from Authorization header or cookie
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Fallback to cookie if needed
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  return null;
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return next();
  }

  // Use the regular authenticate middleware
  return authenticate(req, res, next);
};

module.exports = {
  authenticate,
  optionalAuth,
};
