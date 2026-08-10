// backend/routes/searchRoutes.js

import express from "express";

import {
  getAutocompleteSuggestions,
  getTrendingSearches,
  getRecentSearches,
} from "../controllers/searchController.js";


const router = express.Router();


/**
 * =========================================================
 * 🔎 SEARCH ROUTES
 * =========================================================
 *
 * Mounted from server.js:
 *
 * app.use("/api/search", searchRoutes);
 *
 * Therefore:
 *
 * GET /api/search/autocomplete
 * GET /api/search/suggestions
 * GET /api/search/trending
 * GET /api/search/recent
 *
 * RESPONSIBILITY:
 * ---------------------------------------------------------
 * - Define search endpoints
 * - Forward requests to controllers
 *
 * MUST NOT:
 * ---------------------------------------------------------
 * - Query database
 * - Resolve city
 * - Resolve category
 * - Parse search intent
 * - Rank businesses
 * - Perform search logic
 *
 * =========================================================
 */


/* =========================================================
   🔍 AUTOCOMPLETE
========================================================= */

router.get(
  "/autocomplete",
  getAutocompleteSuggestions
);


/* =========================================================
   🔍 SUGGESTIONS
========================================================= */

/*
 * Backward-compatible alias.
 *
 * Primary frontend endpoint:
 *
 *   /api/search/autocomplete
 *
 * Existing clients using:
 *
 *   /api/search/suggestions
 *
 * will continue to work.
 */

router.get(
  "/suggestions",
  getAutocompleteSuggestions
);


/* =========================================================
   📈 TRENDING SEARCHES
========================================================= */

router.get(
  "/trending",
  getTrendingSearches
);


/* =========================================================
   🕘 RECENT SEARCHES
========================================================= */

router.get(
  "/recent",
  getRecentSearches
);


/* =========================================================
   EXPORT
========================================================= */

export default router;