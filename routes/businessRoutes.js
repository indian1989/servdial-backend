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
} from "../controllers/businessController.js";

import { protect } from "../middleware/authMiddleware.js";

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

// get all businesses
router.get("/", getBusinesses);

// get single business
router.get("/:id", getBusinessById);


// ================= PROTECTED ROUTES =================

router.post("/", protect, createBusiness);
router.put("/:id", protect, updateBusiness);
router.delete("/:id", protect, deleteBusiness);


// ================= PAID FEATURE PLACEHOLDER =================

router.use("/paid-feature", protect, paidFeatureNotice);

export default router;