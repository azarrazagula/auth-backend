require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const { generalLimiter } = require("./middleware/rateLimiter");
const userRoutes = require("./routes/user.routes");
const adminRoutes = require("./routes/Admin/admin.routes");
const foodRoutes = require("./routes/Admin/food.routes");
const superadminRoutes = require("./routes/superadmin.routes");
const userBillingRoutes = require("./routes/userBilling.routes");


// Connect Database
connectDB();

const app = express();

// Security Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        origin.includes("netlify.app")
      ) {
        callback(null, true);
      } else {
        callback(null, true); // For development convenience, we keep it loose if origin: true was there, but let's be slightly more formal
      }
    },
    credentials: true,
  }),
);

// Body Parser
app.use(express.json({ limit: "10mb" })); // Increased limit for image uploads
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie Parser (for refresh tokens)
app.use(cookieParser());

// Define Routes
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/food", foodRoutes);
app.use("/api/superadmin", superadminRoutes);
app.use("/api/billing", userBillingRoutes);

// Health Check Route
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "API is running" });
});

// 404 Handler for undefined routes
app.use((req, res, next) => {
  console.log(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || "Server Error",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`,
  );
});
