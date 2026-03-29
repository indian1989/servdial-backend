import express from "express";

import {
  createBusiness,
  getBusinessById,
  updateBusiness,
  deleteBusiness,
  paidFeatureNotice,
  searchBusinesses,
  suggestSearch,
  getFeaturedBusinesses,
  getTopRatedBusinesses,
  getNearbyBusinesses,
  trackBusinessClick,
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

// track business click
router.post("/:id/click", trackBusinessClick);

// similar businesses
router.get("/similar/:id", getSimilarBusinesses);

// get all businesses (uses search logic)
router.get("/", searchBusinesses);


// ================= SEO BUSINESS ROUTES =================

// industry standard SEO URL
// example: /delhi/plumber/abc-plumbing

router.get("/:city/:category/:slug", getBusinessBySlug);

// existing slug route (kept for compatibility)
router.get("/slug/:slug", getBusinessBySlug);


// ================= SINGLE BUSINESS =================

// get single business by ID
router.get("/:id", getBusinessById);


// ================= BUSINESS ANALYTICS =================

router.put("/:id/view", incrementViews);
router.put("/:id/phone", phoneClick);
router.put("/:id/whatsapp", whatsappClick);


// ================= PROTECTED ROUTES =================

// create business
router.post("/", protect, createBusiness);

// update business
router.put("/:id", protect, updateBusiness);

// delete business
router.delete("/:id", protect, deleteBusiness);


// ================= PAID FEATURE PLACEHOLDER =================

router.use("/paid-feature", protect, paidFeatureNotice);


export default router;