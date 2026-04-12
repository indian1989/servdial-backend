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
import publicBusinessRoutes from "./routes/publicBusinessRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import featuredRoutes from "./routes/featuredRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminBusinessRoutes from "./routes/adminBusinessRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import cityRoutes from "./routes/cityRoutes.js";
import bannerRoutes from "./routes/bannerRoutes.js";
import homepageRoutes from "./routes/homepageRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import recommendationRoutes from "./routes/recommendationRoutes.js";
import providerRoutes from "./routes/providerRoutes.js";
import seoRoutes from "./routes/seoRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import sitemapRoutes from "./routes/sitemapRoutes.js";

import healthRoutes from "./routes/health.js";
// ================= Health Check =================
app.get("/", (req, res) => {
  res.json({ message: "🚀 ServDial API Running..." });
});


// ================= API ROUTES =================

// Auth & Users
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);

// Business
app.use("/api/business", publicBusinessRoutes);
// Admin Core
app.use("/api/admin", adminRoutes);
app.use("/api/admin/businesses", adminBusinessRoutes);


// Categories (IMPORTANT FIX)
app.use("/api/categories", categoryRoutes);
app.use("/api/admin/categories", categoryRoutes);
app.use("/api/admin/cities", cityRoutes);

// Others
app.use("/api/featured", featuredRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/banner", bannerRoutes);
app.use("/api/homepage", homepageRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/provider", providerRoutes);
app.use("/api/seo", seoRoutes);
app.use("/api/location", locationRoutes);

app.use("/health", healthRoutes);
// Sitemap
app.use("/", sitemapRoutes);


// ================= MongoDB =================
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("❌ MONGO_URI not defined");
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
  console.error("🔥 ERROR:", err);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Server Error",
  });
});


// ================= Start Server =================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(
      `🔥 Server running in ${
        process.env.NODE_ENV || "development"
      } mode on port ${PORT}`
    );
  });

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("⚡️ Shutting down...");
    server.close(() => {
      console.log("✅ Server closed");
      process.exit(0);
    });
  });
};

startServer();