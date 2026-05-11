import asyncHandler from "express-async-handler";

import {
  getAutocompleteService,
  getTrendingSearchesService,
  getRecentSearchesService
} from "../services/search/intelligenceService.js";

/* =========================================================
   🚫 LEGACY SEARCH ENDPOINT (SAFE DEPRECATION)
========================================================= */
export const searchBusinesses = asyncHandler(async (req, res) => {
  return res.status(410).json({
    success: false,
    message:
      "Deprecated. Use /businesses/search (unifiedSearchEngine) instead.",
    meta: {
      deprecated: true,
      replacement: "/businesses/search",
    },
  });
});

/* =========================================================
   🔍 AUTOCOMPLETE (INTELLIGENCE LAYER)
========================================================= */
export const getAutocompleteSuggestions = asyncHandler(async (req, res) => {
  const q = (req.query.q || "").trim();

  if (!q) {
    return res.json({
      success: true,
      data: [],
      meta: {
        total: 0,
        type: "autocomplete",
        query: q,
      },
    });
  }

  const data = await getAutocompleteService(q);

  return res.json({
    success: true,
    data,
    meta: {
      total: data.length,
      type: "autocomplete",
      query: q,
    },
  });
});

/* =========================================================
   📈 TRENDING SEARCHES (GLOBAL ANALYTICS)
========================================================= */
export const getTrendingSearches = asyncHandler(async (req, res) => {
  const data = await getTrendingSearchesService();

  return res.json({
    success: true,
    data,
    meta: {
      total: data.length,
      type: "trending",
    },
  });
});

/* =========================================================
   🕘 RECENT SEARCHES (USER CONTEXT AWARE)
========================================================= */
export const getRecentSearches = asyncHandler(async (req, res) => {
  const userId = req.user?._id || null;

  const data = await getRecentSearchesService(userId);

  return res.json({
    success: true,
    data,
    meta: {
      total: data.length,
      type: "recent",
      userScoped: !!userId,
    },
  });
});