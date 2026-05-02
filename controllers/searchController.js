import asyncHandler from "express-async-handler";

import {
  getAutocompleteService,
  getTrendingSearchesService,
  getRecentSearchesService
} from "../services/search/queryIntelligenceEngine.js";

/* =========================================================
   🚫 LEGACY SEARCH ENDPOINT (DEPRECATED SAFELY)
   ========================================================= */
export const searchBusinesses = asyncHandler(async (req, res) => {
  return res.status(410).json({
    success: false,
    message: "Deprecated. Use /business/search instead.",
    meta: {
      deprecated: true
    }
  });
});

/* =========================================================
   🔍 AUTOCOMPLETE (SERVICE DELEGATION)
   ========================================================= */
export const getAutocompleteSuggestions = asyncHandler(async (req, res) => {
  const q = req.query.q || "";

  const suggestions = await getAutocompleteService(q);

  res.json({
    success: true,
    data: suggestions,
    meta: {
      total: suggestions.length,
      type: "autocomplete"
    }
  });
});

/* =========================================================
   📈 TRENDING SEARCHES
   ========================================================= */
export const getTrendingSearches = asyncHandler(async (req, res) => {
  const data = await getTrendingSearchesService();

  res.json({
    success: true,
    data,
    meta: {
      total: data.length,
      type: "trending"
    }
  });
});

/* =========================================================
   🕘 RECENT SEARCHES
   ========================================================= */
export const getRecentSearches = asyncHandler(async (req, res) => {
  const data = await getRecentSearchesService(req.user?._id);

  res.json({
    success: true,
    data,
    meta: {
      total: data.length,
      type: "recent"
    }
  });
});