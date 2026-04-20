// backend/routes/seoRoutes.js
import express from "express";
import {
  generateCityCategoryPages,
  getCityCategoryPage,
} from "../controllers/seoController.js";

const router = express.Router();

// API SEO
router.get("/seo-pages", generateCityCategoryPages);

// PUBLIC SEO PAGE
router.get("/:citySlug/:categorySlug", getCityCategoryPage);

export default router;