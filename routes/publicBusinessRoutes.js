import express from "express";

import {
  getBusinesses,
  getBusinessBySlug,
  getSimilarBusinesses,
  trackBusinessView,
  getBusinessCount,
  getLatestBusinesses,
  searchBusinesses,
} from "../controllers/businessController.js";

const router = express.Router();

/* ================================
   PUBLIC BUSINESS ROUTES
================================ */

// ✅ COUNT
router.get("/count/all", getBusinessCount);

// ✅ LATEST
router.get("/latest", getLatestBusinesses);

// ✅ SEARCH
router.get("/search", searchBusinesses);

// ✅ SIMILAR
router.get("/similar/:id", getSimilarBusinesses);

// ✅ TRACK VIEW
router.post("/:id/view", trackBusinessView);

// ✅ GET ALL
router.get("/", getBusinesses);

// ✅ SINGLE (KEEP LAST)
router.get("/:slug", getBusinessBySlug);

export default router;