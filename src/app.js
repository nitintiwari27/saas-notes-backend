const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const passport = require("./config/passport");

// Import routes
const authRoutes = require("./routes/auth");
const notesRoutes = require("./routes/notes");
const subscriptionRoutes = require("./routes/subscription");
const healthRoutes = require("./routes/health");

// Import validation middleware
const { validate } = require("./utils/validators");
const { sendError } = require("./utils/helpers");

const app = express();

/**
 * Security Middleware
 */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

/**
 * CORS Configuration
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.FRONTEND_URL,
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
    ].filter(Boolean);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
    "Pragma",
  ],
};

app.use(cors(corsOptions));

/**
 * Rate Limiting
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
    timestamp: new Date().toISOString(),
  },
});

/**
 * Body Parsing Middleware
 */
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf);
      } catch (e) {
        res.status(400).json({
          success: false,
          message: "Invalid JSON format",
          timestamp: new Date().toISOString(),
        });
        throw new Error("Invalid JSON");
      }
    },
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

/**
 * Passport Middleware
 */
app.use(passport.initialize());

/**
 * Trust Proxy (for getting real IP addresses)
 */
app.set("trust proxy", 1);

/**
 * Request Logging Middleware
 */
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
    };

    // Log to console (in production, you might want to use a proper logger)
    if (process.env.NODE_ENV !== "test") {
      console.log(JSON.stringify(logData));
    }
  });

  next();
});

/**
 * Routes
 */

// Health check routes (no rate limiting)
app.use("/health", healthRoutes);

// API routes with rate limiting
app.use("/auth", authLimiter, authRoutes);
app.use("/notes", notesRoutes);
app.use("/subscription", subscriptionRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SaaS Notes API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/health",
      auth: "/auth",
      notes: "/notes",
      subscription: "/subscription",
    },
  });
});

/**
 * 404 Handler
 */
app.use((req, res) => {
  sendError(res, 404, `Route ${req.originalUrl} not found`);
});

/**
 * Global Error Handler
 */
app.use((error, req, res, next) => {
  console.error("Global error handler:", error);

  // Mongoose validation error
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((err) => ({
      field: err.path,
      message: err.message,
    }));
    return sendError(res, 400, "Validation error", errors);
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return sendError(res, 409, `${field} already exists`);
  }

  // Mongoose cast error
  if (error.name === "CastError") {
    return sendError(res, 400, "Invalid ID format");
  }

  // JWT errors
  if (error.name === "JsonWebTokenError") {
    return sendError(res, 401, "Invalid token");
  }

  if (error.name === "TokenExpiredError") {
    return sendError(res, 401, "Token expired");
  }

  // CORS error
  if (error.message === "Not allowed by CORS") {
    return sendError(res, 403, "CORS: Origin not allowed");
  }

  // Default error
  const statusCode = error.statusCode || error.status || 500;
  const message = error.message || "Internal server error";

  sendError(res, statusCode, message);
});

/**
 * Graceful Shutdown Handler
 */
const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);

  const server = app.listen();

  server.close((err) => {
    if (err) {
      console.error("Error during server shutdown:", err);
      process.exit(1);
    }

    console.log("HTTP server closed.");
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error("Forcing shutdown after 30 seconds...");
    process.exit(1);
  }, 30000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = app;
