import express from "express";

import {
  createBusiness,
  getBusinesses,
  getBusinessById,
  updateBusiness,
  deleteBusiness,
  paidFeatureNotice,
  searchBusinesses,
  suggestSearch,
  getFeaturedBusinesses,
  getTopRatedBusinesses,
  getNearbyBusinesses,
  getSimilarBusinesses,
  getLatestBusinesses,
  getBusinessBySlug,
  incrementViews,
  phoneClick,
  whatsappClick
} from "../controllers/businessController.js";

import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();


// ================= PUBLIC ROUTES =================

// search businesses
router.get("/search", searchBusinesses);

// search suggestions
router.get("/suggest", suggestSearch);

// featured businesses
router.get("/featured", getFeaturedBusinesses);

// top rated businesses
router.get("/top-rated", getTopRatedBusinesses);

// nearby businesses
router.get("/nearby", getNearbyBusinesses);

// latest businesses
router.get("/latest", getLatestBusinesses);

// similar businesses
router.get("/similar/:id", getSimilarBusinesses);

// get all businesses
router.get("/", getBusinesses);

// get business by slug (SEO)
router.get("/slug/:slug", getBusinessBySlug);

// get single business by ID
router.get("/:id", getBusinessById);


// ================= BUSINESS ANALYTICS =================

router.put("/:id/view", incrementViews);
router.put("/:id/phone", phoneClick);
router.put("/:id/whatsapp", whatsappClick);


// ================= PROTECTED ROUTES =================

router.post("/", protect, upload.single("image"), createBusiness);

router.put("/:id", protect, updateBusiness);

router.delete("/:id", protect, deleteBusiness);


// ================= PAID FEATURE PLACEHOLDER =================

router.use("/paid-feature", protect, paidFeatureNotice);


export default router;