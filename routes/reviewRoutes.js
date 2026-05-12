import express from "express";
import {
  createReview,
  getBusinessReviews,
} from "../controllers/reviewController.js";

import { protect, optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ================= PUBLIC REVIEW ROUTES ================= */

// CREATE REVIEW (optional auth)
router.post("/", optionalAuth, createReview);

// GET BUSINESS REVIEWS
router.get("/business/:businessId", getBusinessReviews);

export default router;