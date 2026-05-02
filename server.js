// backend/server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

// ================= CORE CONFIG =================
app.set("etag", false);

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());

// 🔥 GLOBAL CACHE CONTROL (single layer only)
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.removeHeader("ETag");
  next();
});

// ================= ROUTES IMPORT =================
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";

import publicBusinessRoutes from "./routes/publicBusinessRoutes.js";
import adminBusinessRoutes from "./routes/adminBusinessRoutes.js";

import categoryRoutes from "./routes/categoryRoutes.js";
import adminCategoryRoutes from "./routes/adminCategoryRoutes.js";

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

import adminRoutes from "./routes/adminRoutes.js";

console.log("🔥 ServDial Server Booting...");

// ================= ROOT =================
app.get("/api", (req, res) => {
  res.json({ message: "🚀 ServDial API Running" });
});

// ================= AUTH =================
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);

// ================= BUSINESS =================
app.use("/api/businesses", publicBusinessRoutes);
app.use("/api/admin/businesses", adminBusinessRoutes);

// ================= ADMIN =================
app.use("/api/admin", adminRoutes);

// ================= CATEGORY =================
app.use("/api/categories", categoryRoutes);
app.use("/api/admin/categories", adminCategoryRoutes);

// ================= CITY =================
app.use("/api/cities", cityRoutes);
app.use("/api/admin/cities", adminCityRoutes);

// ================= BANNER =================
app.use("/api/banners", bannerRoutes);
app.use("/api/admin/banners", adminBannerRoutes);

// ================= CORE FEATURES =================
app.use("/api/homepage", homepageRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/provider", providerRoutes);
app.use("/api/location", locationRoutes);

// ================= SEO + INFRA =================
app.use("/api/seo", seoRoutes);
app.use("/api/sitemap", sitemapRoutes);
app.use("/api/health", healthRoutes);

// ================= DB CONNECT =================
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI not defined");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 20,
    });

    console.log("✅ MongoDB Connected:", conn.connection.host);
  } catch (err) {
    console.error("❌ MongoDB Error:", err.message);
    process.exit(1);
  }
};

// ================= ERROR HANDLERS =================
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("❌ Global Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🔥 Server running on port ${PORT}`);
  });
};

startServer();