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

  Business.find({
    featured: true,
    status: "approved"
  })
    .sort({ createdAt: -1 })
    .limit(8)
    .populate("category city")
    .lean(),

  Business.find({
    status: "approved"
  })
    .sort({ rating: -1 })
    .limit(8)
    .populate("category city")
    .lean(),

  Business.find({
    status: "approved"
  })
    .sort({ createdAt: -1 })
    .limit(8)
    .populate("category city")
    .lean(),

  Category.find({ isActive: true })
    .sort({ name: 1 })
    .limit(24)
    .lean(),

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