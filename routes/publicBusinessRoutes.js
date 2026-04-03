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
  getCategoryCount,
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
router.get("/count", getCategoryCount);

// ================= BUSINESS SEO PAGE =================

// ================= RELATION DATA =================
router.get("/similar/:id", getSimilarBusinesses);

// MAIN PUBLIC DETAIL ROUTE
router.get("/:slug", getBusinessBySlug);
// ================= ANALYTICS UNIFIED =================
router.post("/analytics/:id", (req, res, next) => {
  const { type } = req.body;

  if (type === "view") return incrementViews(req, res, next);
  if (type === "call") return phoneClick(req, res, next);
  if (type === "whatsapp") return whatsappClick(req, res, next);

  return res.status(400).json({ success: false, message: "Invalid event type" });
});
// ================= ANALYTICS =================
router.post("/:id/click", trackBusinessClick);
router.post("/:id/view", incrementViews);
router.post("/:id/phone", phoneClick);
router.post("/:id/whatsapp", whatsappClick);


// ================= DEFAULT =================
router.get("/", searchBusinesses);

export default router;