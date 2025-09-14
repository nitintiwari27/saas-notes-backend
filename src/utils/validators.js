const Joi = require("joi");

/**
 * Validation schemas
 */

const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(6).max(100).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "string.max": "Password must not exceed 100 characters",
    "any.required": "Password is required",
  }),
  name: Joi.string().min(2).max(50).required().messages({
    "string.min": "Name must be at least 2 characters long",
    "string.max": "Name must not exceed 50 characters",
    "any.required": "Name is required",
  }),
  accountName: Joi.string().min(2).max(50).required().messages({
    "string.min": "Account name must be at least 2 characters long",
    "string.max": "Account name must not exceed 50 characters",
    "any.required": "Account name is required",
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

const inviteUserSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  name: Joi.string().min(2).max(50).required().messages({
    "string.min": "Name must be at least 2 characters long",
    "string.max": "Name must not exceed 50 characters",
    "any.required": "Name is required",
  }),
  role: Joi.string().valid("admin", "member").default("member").messages({
    "any.only": "Role must be either admin or member",
  }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "any.required": "Current password is required",
  }),
  newPassword: Joi.string().min(6).max(100).required().messages({
    "string.min": "New password must be at least 6 characters long",
    "string.max": "New password must not exceed 100 characters",
    "any.required": "New password is required",
  }),
});

const createNoteSchema = Joi.object({
  title: Joi.string().min(1).max(200).required().messages({
    "string.min": "Title cannot be empty",
    "string.max": "Title must not exceed 200 characters",
    "any.required": "Title is required",
  }),
  description: Joi.string().max(10000).allow("").messages({
    "string.max": "Description must not exceed 10000 characters",
  }),
  tags: Joi.array().items(Joi.string().min(1).max(50)).max(20).messages({
    "array.max": "Maximum 20 tags allowed",
    "string.min": "Tag cannot be empty",
    "string.max": "Tag must not exceed 50 characters",
  }),
});

const updateNoteSchema = Joi.object({
  title: Joi.string().min(1).max(200).messages({
    "string.min": "Title cannot be empty",
    "string.max": "Title must not exceed 200 characters",
  }),
  description: Joi.string().max(10000).allow("").messages({
    "string.max": "Description must not exceed 10000 characters",
  }),
  tags: Joi.array().items(Joi.string().min(1).max(50)).max(20).messages({
    "array.max": "Maximum 20 tags allowed",
    "string.min": "Tag cannot be empty",
    "string.max": "Tag must not exceed 50 characters",
  }),
});

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    "number.integer": "Page must be an integer",
    "number.min": "Page must be at least 1",
  }),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    "number.integer": "Limit must be an integer",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit must not exceed 100",
  }),
  search: Joi.string().max(200).messages({
    "string.max": "Search query must not exceed 200 characters",
  }),
  tags: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
});

const verifyPaymentSchema = Joi.object({
  razorpay_order_id: Joi.string().required().messages({
    "any.required": "Razorpay order ID is required",
  }),
  razorpay_payment_id: Joi.string().required().messages({
    "any.required": "Razorpay payment ID is required",
  }),
  razorpay_signature: Joi.string().required().messages({
    "any.required": "Razorpay signature is required",
  }),
  paymentId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid payment ID format",
      "any.required": "Payment ID is required",
    }),
});

/**
 * Validation middleware factory
 */
const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const dataToValidate = source === "query" ? req.query : req.body;

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
        timestamp: new Date().toISOString(),
      });
    }

    // Replace the original data with validated and sanitized data
    if (source === "query") {
      req.query = value;
    } else {
      req.body = value;
    }

    next();
  };
};

module.exports = {
  // Schemas
  registerSchema,
  loginSchema,
  inviteUserSchema,
  changePasswordSchema,
  createNoteSchema,
  updateNoteSchema,
  paginationSchema,
  verifyPaymentSchema,

  // Middleware
  validate,
};
