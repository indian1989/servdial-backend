// backend/routes/publicBusinessRoutes.js

import express from "express";

import {
  getBusinesses,
  getBusinessBySlug,
  getSimilarBusinesses,
  trackBusinessView,
  trackBusinessAnalytics,
  getBusinessCount,
  getLatestBusinesses,
} from "../controllers/businessController.js";

import {
  unifiedSearch,
} from "../controllers/unifiedSearchController.js";

const router = express.Router();

/* =========================================================
   🟢 PUBLIC BUSINESS ROUTES
========================================================= */

/* =========================
   📊 COUNT
========================= */
router.get(
  "/count/all",
  getBusinessCount
);

router.post(
"/analytics/:id",
trackBusinessAnalytics
);

/* =========================
   🆕 LATEST
========================= */
router.get(
  "/latest",
  getLatestBusinesses
);

/* =========================
   🔎 UNIFIED SEARCH
========================= */
router.get(
  "/search",
  unifiedSearch
);

/* =========================
   🔗 SIMILAR BUSINESSES
========================= */
router.get(
  "/similar/:id",
  getSimilarBusinesses
);

/* =========================
   👁 TRACK VIEW
========================= */
router.post(
  "/:id/view",
  trackBusinessView
);

/* =========================
   📋 GET ALL
========================= */
router.get(
  "/",
  getBusinesses
);

/* =========================
   📄 SINGLE BUSINESS
   KEEP LAST
========================= */
router.get(
  "/:slug",
  getBusinessBySlug
);

export default router;