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
} from "../controllers/businessController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ================= PUBLIC ROUTES =================

// search businesses
router.get("/search", searchBusinesses);

// search suggestions
router.get("/suggest", suggestSearch);

// get all businesses
router.get("/", getBusinesses);

// get single business
router.get("/:id", getBusinessById);

// ================= PROTECTED ROUTES =================
router.post("/", protect, createBusiness);
router.put("/:id", protect, updateBusiness);
router.delete("/:id", protect, deleteBusiness);

// ================= PAID FEATURE PLACEHOLDER =================
// User/Provider trying to access paid feature
router.use("/paid-feature", protect, paidFeatureNotice);

export default router;