// backend/routes/searchRoutes.js

import express from "express";

import {
  getAutocompleteSuggestions,
  getTrendingSearches,
  getRecentSearches,
} from "../controllers/searchController.js";

const router = express.Router();

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

export default router;