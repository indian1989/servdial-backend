import express from "express";
import Business from "../models/Business.js";
import { resolveCity } from "../services/resolver/cityResolver.js";
import { rankBusinesses } from "../utils/rankBusinesses.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { city } = req.query;

    let query = {
      status: "approved",
      isDeleted: false,
    };
    
    if (city) {
      const cityDoc = await resolveCity(city);
      
      if (!cityDoc) {
        return res.status(404).json({
          success: false,
          message: "City not found",
        });
      }
      query.cityId = cityDoc._id;
    }

  const raw = await Business.find(query)
  .select(`
  name
  slug
  logo
  images
  address

  cityName
  district
  state

  categoryId
  categorySlug
  categoryName

  phone
  whatsapp

  averageRating
  totalReviews

  views
  phoneClicks
  whatsappClicks

  isFeatured
  featurePriority
  isVerified
  plan
  isTrustedPartner
  isPremiumPartner

  businessHours
  location

  cityId
`)
  .populate("cityId", "name slug")
  .populate("categoryId", "name slug")
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