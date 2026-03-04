import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

// Routes
import authRoutes from "./routes/authRoutes.js";
import businessRoutes from "./routes/businessRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import featuredRoutes from "./routes/featuredRoutes.js";
import userRoutes from "./routes/userRoutes.js";
dotenv.config();

const app = express();

// ================= Middleware =================
app.use(cors());
app.use(express.json());

// ================= Routes =================
app.get("/", (req, res) => {
  res.json({ message: "🚀 ServDial API Running..." });
});

app.use("/api/auth", authRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/featured", featuredRoutes);
app.use("/api/user", userRoutes);

// ================= MongoDB Connection =================
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

// ================= Error Handler =================
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Server Error",
  });
});

// ================= Start Server =================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`🔥 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
  });

  // Graceful Shutdown
  process.on("SIGINT", () => {
    console.log("⚡️ Received SIGINT. Closing server...");
    server.close(() => {
      console.log("✅ Server closed successfully.");
      process.exit(0);
    });
  });
};

startServer();