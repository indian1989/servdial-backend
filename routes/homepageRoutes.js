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

    const featuredBusinesses = await Business.find({ featured: true })
      .limit(8)
      .sort({ createdAt: -1 });

    const topRatedBusinesses = await Business.find()
      .sort({ rating: -1 })
      .limit(8);

    const categories = await Category.find()
      .sort({ name: 1 })
      .limit(24);

    const cities = await City.find()
      .sort({ name: 1 })
      .limit(20);

    res.json({
      success: true,
      featuredBusinesses,
      topRatedBusinesses,
      categories,
      cities
    });

  })
);

export default router;