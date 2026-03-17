import asyncHandler from "express-async-handler";

import Category from "../models/Category.js";
import Business from "../models/Business.js";
import City from "../models/City.js";
import Banner from "../models/Banner.js";


// ================= HOMEPAGE DATA =================
export const getHomepageData = asyncHandler(async (req, res) => {

  const [
    categories,
    featuredBusinesses,
    topRatedBusinesses,
    latestBusinesses,
    cities,
    banners
  ] = await Promise.all([

    // Categories
    Category.find({ isActive: true })
      .sort({ order: 1 })
      .limit(12)
      .lean(),

    // Featured Businesses
    Business.find({
      isFeatured: true,
      status: "approved"
    })
      .sort({ featurePriority: -1, createdAt: -1 })
      .limit(8)
      .select("name slug city logo averageRating images")
      .lean(),

    // Top Rated Businesses
    Business.find({
      status: "approved"
    })
      .sort({ averageRating: -1 })
      .limit(8)
      .select("name slug city logo averageRating images")
      .lean(),

    // Latest Businesses
    Business.find({
      status: "approved"
    })
      .sort({ createdAt: -1 })
      .limit(8)
      .select("name slug city logo averageRating images")
      .lean(),

    // Popular Cities
    City.find({ isPopular: true })
      .sort({ name: 1 })
      .limit(8)
      .lean(),

    // Active Banners
    Banner.find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean()

  ]);

  res.status(200).json({
    success: true,
    categories,
    featuredBusinesses,
    topRatedBusinesses,
    latestBusinesses,
    cities,
    banners
  });

});