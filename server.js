require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/database");

// Validate required environment variables
const requiredEnvVars = [
  "MONGODB_URI",
  "JWT_SECRET",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(
    "Missing required environment variables:",
    missingEnvVars.join(", ")
  );
  console.error("Please check your .env file");
  process.exit(1);
}

const PORT = process.env.PORT || 3000;

/**
 * Start Server
 */
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log("=================================");
      console.log("🚀 SaaS Notes API Server Started");
      console.log("=================================");
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`Port: ${PORT}`);
      console.log(`Health Check: http://localhost:${PORT}/health`);
      console.log(`API Docs: http://localhost:${PORT}/`);
      console.log("=================================");
    });

    // Handle server errors
    server.on("error", (error) => {
      if (error.syscall !== "listen") {
        throw error;
      }

      const bind = typeof PORT === "string" ? "Pipe " + PORT : "Port " + PORT;

      switch (error.code) {
        case "EACCES":
          console.error(`${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case "EADDRINUSE":
          console.error(`${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

    // Graceful shutdown handlers
    const gracefulShutdown = (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async (err) => {
        if (err) {
          console.error("Error during server shutdown:", err);
          process.exit(1);
        }

        console.log("HTTP server closed.");

        // Close database connection
        try {
          const mongoose = require("mongoose");
          await mongoose.connection.close();
          console.log("Database connection closed.");
        } catch (dbError) {
          console.error("Error closing database connection:", dbError);
        }

        console.log("Graceful shutdown completed.");
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        console.error("Forcing shutdown after 30 seconds...");
        process.exit(1);
      }, 30000);
    };

    // Listen for shutdown signals
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error);
      gracefulShutdown("UNCAUGHT_EXCEPTION");
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
      gracefulShutdown("UNHANDLED_REJECTION");
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();
