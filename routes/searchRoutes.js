// backend/routes/searchRoutes.js

import express from "express";

import {
  getAutocompleteSuggestions,
  getTrendingSearches,
  getRecentSearches,
} from "../controllers/searchController.js";

const router = express.Router();

/*
=========================================================
🔎 SEARCH ROUTES
=========================================================

Mounted from server.js:

app.use("/api/search", searchRoutes);

Therefore:

GET /api/search/autocomplete
GET /api/search/trending
GET /api/search/recent

RESPONSIBILITY:
---------------------------------------------------------
- Define search endpoints
- Forward requests to controllers

MUST NOT:
---------------------------------------------------------
- Query database
- Resolve city
- Resolve category
- Parse search intent
- Rank businesses
- Perform search logic

=========================================================
*/

/* =========================================================
🔍 AUTOCOMPLETE
========================================================= */

router.get(
  "/autocomplete",
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