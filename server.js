// backend/server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

// ================= Middleware =================
app.use(cors());
app.use(express.json());

// ================= Routes =================
import authRoutes from "./routes/authRoutes.js";
import businessRoutes from "./routes/businessRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import featuredRoutes from "./routes/featuredRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminBusinessRoutes from "./routes/adminBusinessRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import cityRoutes from "./routes/cityRoutes.js";
import bannerRoutes from "./routes/bannerRoutes.js";
import homepageRoutes from "./routes/homepageRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";

app.get("/", (req, res) => {
  res.json({ message: "🚀 ServDial API Running..." });
});

app.use("/api/auth", authRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminBusinessRoutes);
app.use("/api/featured", featuredRoutes);
app.use("/api/user", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/banner", bannerRoutes);
app.use("/api/homepage", homepageRoutes);
app.use("/api/search", searchRoutes);

import path from "path";

const __dirname = path.resolve();

// Serve frontend build
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// React router fallback
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../frontend/dist", "index.html"));
});
// ================= MongoDB Connection =================
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("❌ MONGO_URI not defined in environment variables");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 20,
    });

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
  // 1️⃣ Connect to MongoDB Atlas
  await connectDB();

  // 3️⃣ Start Express Server
  const server = app.listen(PORT, () => {
    console.log(
      `🔥 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`
    );
  });

  // 4️⃣ Graceful Shutdown
  process.on("SIGINT", () => {
    console.log("⚡️ Received SIGINT. Closing server...");
    server.close(() => {
      console.log("✅ Server closed successfully.");
      process.exit(0);
    });
  });
};

startServer();