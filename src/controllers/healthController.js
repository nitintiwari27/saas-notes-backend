const mongoose = require("mongoose");
const { sendResponse, sendError } = require("../utils/helpers");

/**
 * Health check endpoint
 * GET /health
 */
const healthCheck = async (req, res) => {
  try {
    const healthData = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
    };

    // Check database connection
    if (mongoose.connection.readyState === 1) {
      healthData.database = "connected";
    } else {
      healthData.database = "disconnected";
      healthData.status = "degraded";
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    healthData.memory = {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + " MB",
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + " MB",
    };

    const statusCode = healthData.status === "ok" ? 200 : 503;

    res.status(statusCode).json(healthData);
  } catch (error) {
    console.error("Health check error:", error);
    res.status(503).json({
      status: "error",
      message: "Health check failed",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Detailed health check with database test
 * GET /health/detailed
 */
const detailedHealthCheck = async (req, res) => {
  try {
    const healthData = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
      checks: {},
    };

    // Database connection check
    try {
      if (mongoose.connection.readyState === 1) {
        // Test database with a simple query
        await mongoose.connection.db.admin().ping();
        healthData.checks.database = {
          status: "healthy",
          message: "Connected and responsive",
        };
      } else {
        healthData.checks.database = {
          status: "unhealthy",
          message: "Not connected",
        };
        healthData.status = "degraded";
      }
    } catch (dbError) {
      healthData.checks.database = {
        status: "unhealthy",
        message: "Connection test failed",
      };
      healthData.status = "degraded";
    }

    // Memory usage check
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);

    healthData.checks.memory = {
      status: memoryUsedMB < 500 ? "healthy" : "warning", // Warning if using more than 500MB
      used: `${memoryUsedMB} MB`,
      total: `${memoryTotalMB} MB`,
      percentage: `${Math.round((memoryUsedMB / memoryTotalMB) * 100)}%`,
    };

    // Environment variables check
    const requiredEnvVars = [
      "MONGODB_URI",
      "JWT_SECRET",
      "RAZORPAY_KEY_ID",
      "RAZORPAY_KEY_SECRET",
    ];
    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar]
    );

    healthData.checks.environment = {
      status: missingEnvVars.length === 0 ? "healthy" : "unhealthy",
      message:
        missingEnvVars.length === 0
          ? "All required environment variables are set"
          : `Missing environment variables: ${missingEnvVars.join(", ")}`,
    };

    if (missingEnvVars.length > 0) {
      healthData.status = "degraded";
    }

    const statusCode = healthData.status === "ok" ? 200 : 503;

    res.status(statusCode).json(healthData);
  } catch (error) {
    console.error("Detailed health check error:", error);
    res.status(503).json({
      status: "error",
      message: "Detailed health check failed",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
};

module.exports = {
  healthCheck,
  detailedHealthCheck,
};
