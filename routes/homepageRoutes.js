import express from "express";
import Business from "../models/Business.js";
import Category from "../models/Category.js";
import City from "../models/City.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {

    const featuredBusinesses = await Business.find({ isFeatured: true }).limit(8);

    const topRatedBusinesses = await Business.find({})
      .sort({ rating: -1 })
      .limit(8);

    const categories = await Category.find({}).limit(12);

    const cities = await City.find({}).limit(8);

    res.json({
      featuredBusinesses,
      topRatedBusinesses,
      categories,
      cities,
    });

  } catch (error) {

    console.error("Homepage error:", error);

    res.status(500).json({
      message: "Homepage API failed",
    });

  }
});

export default router;