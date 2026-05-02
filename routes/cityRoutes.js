import express from "express";

import {
  getAllCities,
  getCityBySlug,
  getTrendingCities,
} from "../controllers/cityController.js";

const router = express.Router();

/* ================= PUBLIC ================= */

// 🔥 Trending cities (must come first)
router.get("/trending", getTrendingCities);

// 🔥 All cities
router.get("/", getAllCities);

// 🔥 City by slug (SEO route)
router.get("/:slug", getCityBySlug);

export default router;