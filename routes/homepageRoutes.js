import express from "express";
import asyncHandler from "express-async-handler";

import Business from "../models/Business.js";
import Category from "../models/Category.js";
import City from "../models/City.js";

const router = express.Router();

// ================= Homepage Data =================
router.get(
  "/",
  asyncHandler(async (req, res) => {

    const [
      featuredBusinesses,
      topRatedBusinesses,
      latestBusinesses,
      categories,
      cities
    ] = await Promise.all([

      // Featured Businesses
      Business.find({
        isFeatured: true,
        status: "approved"
      })
        .sort({ featurePriority: -1, createdAt: -1 })
        .limit(8)
        .lean(),

      // Top Rated Businesses
      Business.find({
        status: "approved"
      })
        .sort({ averageRating: -1 })
        .limit(8)
        .lean(),

      // Latest Businesses
      Business.find({
        status: "approved"
      })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),

      // Categories
      Category.find({ isActive: true })
        .sort({ name: 1 })
        .limit(24)
        .lean(),

      // Popular Cities
      City.find({ isPopular: true })
        .sort({ name: 1 })
        .limit(20)
        .lean()
    ]);

    res.json({
      success: true,
      featuredBusinesses,
      topRatedBusinesses,
      latestBusinesses,
      categories,
      cities
    });

  })
);

export default router;