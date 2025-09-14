const express = require("express");
const router = express.Router();

const {
  healthCheck,
  detailedHealthCheck,
} = require("../controllers/healthController");

/**
 * Health Check Routes - No authentication required
 */

// Basic health check
router.get("/", healthCheck);

// Detailed health check
router.get("/detailed", detailedHealthCheck);

module.exports = router;
