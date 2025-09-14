const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const slugify = require("slugify");

/**
 * Hash password using bcrypt
 */
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare password with hash
 */
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Generate JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error("Invalid token");
  }
};

/**
 * Generate unique slug from name
 */
const generateSlug = (name, suffix = "") => {
  const baseSlug = slugify(name, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g,
  });

  return suffix ? `${baseSlug}-${suffix}` : baseSlug;
};

/**
 * Generate random string
 */
const generateRandomString = (length = 8) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Send standardized API response
 */
const sendResponse = (res, statusCode, success, message, data = null) => {
  return res.status(statusCode).json({
    success,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send error response
 */
const sendError = (res, statusCode, message, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  generateSlug,
  generateRandomString,
  sendResponse,
  sendError,
};
