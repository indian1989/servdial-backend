// backend/server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

// 🚨 CRITICAL: DISABLE ETAG (fix 304 issue)
app.set("etag", false);

// ================= Middleware =================
app.use(cors());
app.use(express.json());

// ================= GLOBAL NO CACHE (FINAL) =================
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

app.use((req, res, next) => {
  res.removeHeader("ETag");
  next();
});

// ================= Routes =================
import authRoutes from "./routes/authRoutes.js";
import publicBusinessRoutes from "./routes/publicBusinessRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminBusinessRoutes from "./routes/adminBusinessRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import cityRoutes from "./routes/cityRoutes.js";
import adminCityRoutes from "./routes/adminCityRoutes.js";
import bannerRoutes from "./routes/bannerRoutes.js";
import adminBannerRoutes from "./routes/adminBannerRoutes.js";
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
app.get("/api", (req, res) => {
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

// Admin Businesses (separate namespace)
app.use("/api/admin-businesses", adminBusinessRoutes);

// ============= BANNERS =============
app.use("/api/banners", bannerRoutes);              // public + user
app.use("/api/admin/banners", adminBannerRoutes);   // admin + superadmin

// Categories
// ⚠️ TEMP: shared routes (admin + public)
// TODO: split into adminCategoryRoutes & publicCategoryRoutes later
app.use("/api/categories", categoryRoutes);
app.use("/api/admin/categories", categoryRoutes);

// Public (read only)
app.use("/api/cities", cityRoutes);

// Admin only
app.use("/api/admin/cities", adminCityRoutes);

// Others

app.use("/api/homepage", homepageRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/provider", providerRoutes);
app.use("/api/location", locationRoutes);

app.use("/health", healthRoutes);

// Sitemap
app.use("/api/sitemap", sitemapRoutes);

// SEO PUBLIC ROUTES
app.use("/", seoRoutes);

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

// ================= 404 Handler =================
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

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