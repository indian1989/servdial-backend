// backend/routes/publicBusinessRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";

import {
  getBusinesses,
  claimBusiness,
  getBusinessBySlug,
  trackBusinessView,
  trackBusinessAnalytics,
  getBusinessCount,
} from "../controllers/businessController.js";

import {
  getLatestBusinesses,
  getFeaturedBusinesses,
  getTopRatedBusinesses,
  getNearbyBusinesses,
  getSimilarBusinesses,
  getPopularSearches,
} from "../controllers/business/businessDiscoveryController.js";

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
   ⭐ FEATURED
========================= */

router.get(
  "/featured",
  getFeaturedBusinesses
);

/* =========================
   ⭐ TOP RATED
========================= */

router.get(
  "/top-rated",
  getTopRatedBusinesses
);

/* =========================
📍 NEARBY
========================= */
router.get(
  "/nearby",
  getNearbyBusinesses
);

/* =========================
   🔥 POPULAR SEARCHES
========================= */

router.get(

  "/popular-searches",

  getPopularSearches

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
  (req,res,next)=>{
    console.log("🔥 GET /businesses ROUTE HIT");
    next();
  },
  getBusinesses
);

router.post(
 "/:id/claim",
 protect,
 claimBusiness
);

/* =========================
   📄 SINGLE BUSINESS
   KEEP LAST
========================= */

// CITY + CATEGORY + BUSINESS
router.get(
  "/:citySlug/:categorySlug/:slug",
  getBusinessBySlug
);

// LEGACY / OLD
router.get(
  "/:slug",
  getBusinessBySlug
);

export default router;