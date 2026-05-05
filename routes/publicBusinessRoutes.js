import express from "express";

import {
  getBusinesses,
  getBusinessBySlug,
  getSimilarBusinesses,
  trackBusinessView,
  getBusinessCount,
} from "../controllers/businessController.js";

const router = express.Router();

/* ================================
   PUBLIC BUSINESS ROUTES
================================ */

// GET all businesses
router.get("/", getBusinesses);

// GET single business
router.get("/:slug", getBusinessBySlug);

// ✅ SIMILAR (FIXED PATH)
router.get("/:id/similar", getSimilarBusinesses);

// ✅ TRACK VIEW
router.post("/:id/view", trackBusinessView);

// ✅ COUNT
router.get("/count/all", getBusinessCount);

export default router;