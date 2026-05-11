import express from "express";

import { unifiedSearch } from "../controllers/unifiedSearchController.js";

import {
  getAutocompleteSuggestions,
  getTrendingSearches,
  getRecentSearches,
} from "../controllers/searchController.js";

const router = express.Router();

/* =========================
   🔥 MAIN SEARCH ENGINE
========================= */
router.get("/businesses", unifiedSearch);

/* =========================
   AUTOCOMPLETE
========================= */
router.get("/autocomplete", getAutocompleteSuggestions);
router.get("/suggestions", getAutocompleteSuggestions);

/* =========================
   INTELLIGENCE
========================= */
router.get("/trending", getTrendingSearches);
router.get("/recent", getRecentSearches);

export default router;