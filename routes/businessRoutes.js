import express from "express";
import {
  createBusiness,
  getBusinesses,
  getBusinessById,
  updateBusiness,
  deleteBusiness,
  paidFeatureNotice,
  searchBusinesses,
  suggestedSearch,
} from "../controllers/businessController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ================= PUBLIC ROUTES =================
router.get("/", getBusinesses);
router.get("/:id", getBusinessById);
router.get("/search", searchBusinesses);
router.get("/suggest", suggestSearch);


// ================= PROTECTED ROUTES =================
router.post("/", protect, createBusiness);
router.put("/:id", protect, updateBusiness);
router.delete("/:id", protect, deleteBusiness);

// ================= PAID FEATURE PLACEHOLDER =================
// User/Provider trying to access paid feature
router.use("/paid-feature", protect, paidFeatureNotice);

export default router;