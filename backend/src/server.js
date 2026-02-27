require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { testConnection } = require("./config/database");

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());

// CORS configuration (allow multiple localhost dev ports)
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').filter(Boolean);
const localhostRegex = /^http:\/\/localhost:\d+$/;
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser/SSR requests
      if (!origin) return callback(null, true);

      // Explicitly allowed origins via env (comma-separated)
      if (allowedOrigins.length && allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // In non-production, allow any localhost port for Vite dev servers
      if (process.env.NODE_ENV !== 'production' && localhostRegex.test(origin)) {
        return callback(null, true);
      }

      // Default single origin fallback for production
      const defaultOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
      if (origin === defaultOrigin) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Rate limiting for authentication routes
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 105, // Max 5 login attempts per 5 minutes from a single IP
  message:
    "Too many login attempts from this IP, please try again after 15 minutes.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// General rate limiting for other API routes
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 2 minutes
  max: 1500, // Max 400 requests per 2 minutes from a single IP
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Static files for uploads
app.use("/uploads", express.static("uploads"));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Dai Trading ERP API is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Import routes
const authRoutes = require("./routes/authRoutes");
const stockRoutes = require("./routes/stockRoutes");
const productRoutes = require("./routes/productRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const customerRoutes = require("./routes/customerRoutes");
const warehouseRoutes = require("./routes/warehouseRoutes");
const wasteRoutes = require("./routes/wasteRoutes");
const salesRoutes = require("./routes/salesRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const reportRoutes = require("./routes/reportRoutes");
const auditRoutes = require("./routes/auditRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const exportRoutes = require("./routes/exportRoutes");
const userRoutes = require("./routes/userRoutes");
const ledgerRoutes = require("./routes/ledgerRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const quotationRoutes = require("./routes/quotationRoutes");
const deliveryNoteRoutes = require("./routes/deliveryNoteRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const posRoutes = require("./routes/posRoutes");
const documentRoutes = require("./routes/documentRoutes");

// Mount routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/stock", apiLimiter, stockRoutes);
app.use("/api/products", apiLimiter, productRoutes);
app.use("/api/suppliers", apiLimiter, supplierRoutes);
app.use("/api/customers", apiLimiter, customerRoutes);
app.use("/api/warehouses", apiLimiter, warehouseRoutes);
app.use("/api/users", apiLimiter, userRoutes);
app.use("/api/waste", apiLimiter, wasteRoutes);
app.use("/api/sales", apiLimiter, salesRoutes);
app.use("/api/invoices", apiLimiter, invoiceRoutes);
app.use("/api/expenses", apiLimiter, expenseRoutes);
app.use("/api/purchases", apiLimiter, purchaseRoutes);
app.use("/api/reports", apiLimiter, reportRoutes);
app.use("/api/audit-logs", apiLimiter, auditRoutes);
app.use("/api/export", apiLimiter, exportRoutes);
app.use("/api/ledger", apiLimiter, ledgerRoutes);
app.use("/api/settings", apiLimiter, settingsRoutes);
app.use("/api/quotations", apiLimiter, quotationRoutes);
app.use("/api/delivery-notes", apiLimiter, deliveryNoteRoutes);
app.use("/api/notifications", apiLimiter, notificationRoutes);
app.use("/api/dashboard", apiLimiter, dashboardRoutes);
app.use("/api/pos", apiLimiter, posRoutes);
app.use("/api/documents", apiLimiter, documentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    const isConnected = await testConnection();

    if (!isConnected) {
      console.error(
        "❌ Failed to connect to database. Please check your configuration.",
      );
      process.exit(1);
    }

    // Start cron jobs
    if (process.env.NODE_ENV !== "test") {
      require("./jobs/expiryAlerts");
    }

    // Start listening
    app.listen(PORT, () => {
      console.log("");
      console.log(
        "═══════════════════════════════════════════════════════════",
      );
      console.log("  🚀 Dai Trading ERP Backend Server");
      console.log(
        "═══════════════════════════════════════════════════════════",
      );
      console.log(`  📡 Server running on port: ${PORT}`);
      console.log(`  🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`  🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`  📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(
        "═══════════════════════════════════════════════════════════",
      );
      console.log("");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down gracefully...");
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;
