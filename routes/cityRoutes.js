import express from "express";

import {
  getAllCities,
  getCityBySlug,
  getTrendingCities,
  getStates,
  getAreasByCity,
} from "../controllers/cityController.js";

const router = express.Router();

/* ================= PUBLIC ================= */

// 🔥 Trending cities (must come first)
router.get("/trending", getTrendingCities);

// 🔥 All states
router.get("/states", getStates);

// 🔥 All cities
router.get("/", getAllCities);

// 🔥 Areas by selected city

router.get(
  "/:cityId/areas",
  getAreasByCity
);

// 🔥 City by slug (SEO route)
router.get("/:slug", getCityBySlug);

export default router;