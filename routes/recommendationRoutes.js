import express from "express";
import Business from "../models/Business.js";
import { resolveCity } from "../services/resolver/cityResolver.js";
import { rankBusinesses } from "../utils/rankBusinesses.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { city } = req.query;

    if (!city) {
      return res.json({ success: true, data: [] });
    }

    const cityDoc = await resolveCity(city);

    if (!cityDoc) {
      return res.status(404).json({
        success: false,
        message: "City not found",
      });
    }

    const raw = await Business.find({
      status: "approved",
      isDeleted: false,
      cityId: cityDoc._id,
    })
      .select("name slug averageRating totalReviews views isFeatured featurePriority cityId")
      .populate("cityId", "name slug")
      .limit(50)
      .lean();

    const ranked = rankBusinesses(raw, {
      intent: {
        sortBy: "default",
      },
    });

    res.json({
      success: true,
      data: ranked,
    });

  } catch (error) {
    console.error("🔥 Recommendation error:", error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

export default router;