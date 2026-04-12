// backend/routes/searchRoutes.js
import express from "express";
import { searchBusinesses } from "../controllers/searchController.js";
import { getAutocompleteSuggestions } from "../controllers/autocompleteController.js";
import { getTrendingSearches } from "../controllers/trendingController.js";
import { getRecentSearches } from "../controllers/recentSearchController.js";


const router = express.Router();

// Search businesses
router.get("/", searchBusinesses);
router.get("/autocomplete", getAutocompleteSuggestions);
router.get("/suggestions", getAutocompleteSuggestions);
router.get("/trending", getTrendingSearches);
router.get("/recent", getRecentSearches);
export default router;