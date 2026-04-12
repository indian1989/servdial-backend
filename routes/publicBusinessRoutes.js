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


// ================= DISCOVERY (CORE) =================
router.get("/discover", searchBusinesses);   // 👈 unified default entry
router.get("/search", searchBusinesses);     // backward compatibility

router.get("/suggest", suggestSearch);


// ================= RANKED FEEDS =================
router.get("/featured", getFeaturedBusinesses);
router.get("/top-rated", getTopRatedBusinesses);
router.get("/nearby", getNearbyBusinesses);
router.get("/recommended", getRecommendedBusinesses);
router.get("/latest", getLatestBusinesses);


// ================= METRICS =================
router.get("/count", getCategoryCount);


// ================= BUSINESS DETAIL (SEO) =================
router.get("/b/:slug", getBusinessBySlug);


// ================= RELATED =================
router.get("/similar/:id", getSimilarBusinesses);


// ================= ANALYTICS (UNIFIED SYSTEM) =================
router.post("/analytics", (req, res, next) => {
  const { type } = req.body;

  switch (type) {
    case "view":
      return incrementViews(req, res, next);

    case "click":
      return trackBusinessClick(req, res, next);

    case "phone":
      return phoneClick(req, res, next);

    case "whatsapp":
      return whatsappClick(req, res, next);

    default:
      return res.status(400).json({
        success: false,
        message: "Invalid event type"
      });
  }
});


// ================= LEGACY ANALYTICS (KEEP FOR SAFETY) =================
router.post("/:id/click", trackBusinessClick);
router.post("/:id/view", incrementViews);
router.post("/:id/phone", phoneClick);
router.post("/:id/whatsapp", whatsappClick);


// ================= DEFAULT FALLBACK =================
router.get("/", searchBusinesses);

export default router;