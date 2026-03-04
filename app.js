import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// Import routes (abhi placeholder, future me add karenge)
import authRoutes from "./routes/authRoutes.js";
import businessRoutes from "./routes/businessRoutes.js";

const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Cross-Origin requests
app.use(express.json()); // JSON body parser
app.use(morgan("dev")); // Logging for development

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/business", businessRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({ message: "🔥 ServDial Backend Running" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Global Error:", err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

export default app;