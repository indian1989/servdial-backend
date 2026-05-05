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

// ✅ COUNT (must be before dynamic routes)
router.get("/count/all", getBusinessCount);

// ✅ SIMILAR (use clear path, no conflict)
router.get("/similar/:id", getSimilarBusinesses);

// ✅ TRACK VIEW
router.post("/:id/view", trackBusinessView);

// ✅ GET ALL
router.get("/", getBusinesses);

// ✅ SINGLE (KEEP LAST — VERY IMPORTANT)
router.get("/:slug", getBusinessBySlug);

export default router;