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

// get similar businesses
router.get("/similar/:id", getSimilarBusinesses);

// get all businesses
router.get("/", getBusinesses);

// get single business
router.get("/:id", getBusinessById);


// ================= PROTECTED ROUTES =================

router.post("/", protect, upload.single("image"), createBusiness);
router.put("/:id", protect, updateBusiness);
router.delete("/:id", protect, deleteBusiness);


// ================= PAID FEATURE PLACEHOLDER =================

router.use("/paid-feature", protect, paidFeatureNotice);

export default router;