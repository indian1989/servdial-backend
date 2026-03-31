// backend/routes/publicBusinessRoutes.js
import express from "express";
import {
  searchBusinesses,
  suggestSearch,
  getFeaturedBusinesses,
  getTopRatedBusinesses,
  getNearbyBusinesses,
  getRecommendedBusinesses,
  getLatestBusinesses,
  getBusinessBySlug,
  getSimilarBusinesses,
  trackBusinessClick,
  incrementViews,
  phoneClick,
  whatsappClick
} from "../controllers/businessController.js";

const router = express.Router();


// ================= SEARCH / DISCOVERY =================
router.get("/search", searchBusinesses);
router.get("/suggest", suggestSearch);

router.get("/featured", getFeaturedBusinesses);
router.get("/top-rated", getTopRatedBusinesses);
router.get("/nearby", getNearbyBusinesses);
router.get("/recommended", getRecommendedBusinesses);
router.get("/latest", getLatestBusinesses);


// ================= BUSINESS SEO PAGE =================

// ================= RELATION DATA =================
router.get("/similar/:id", getSimilarBusinesses);

// MAIN PUBLIC DETAIL ROUTE
router.get("/:slug", getBusinessBySlug);

// ================= ANALYTICS =================
router.post("/:id/click", trackBusinessClick);
router.post("/:id/view", incrementViews);
router.post("/:id/phone", phoneClick);
router.post("/:id/whatsapp", whatsappClick);


// ================= DEFAULT =================
router.get("/", searchBusinesses);

export default router;