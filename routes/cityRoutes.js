import express from "express";

import {
  getAllCities,
  getCityBySlug,
  getTrendingCities,
  getStates,
} from "../controllers/cityController.js";

const router = express.Router();

/* ================= PUBLIC ================= */

// 🔥 Trending cities (must come first)
router.get("/trending", getTrendingCities);

// 🔥 All states
router.get("/states", getStates);

// 🔥 All cities
router.get("/", getAllCities);

// 🔥 City by slug (SEO route)
router.get("/:slug", getCityBySlug);

export default router;