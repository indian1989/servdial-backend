// backend/controllers/searchController.js

import asyncHandler from "express-async-handler";
import Business from "../models/Business.js";

/* =========================================================
   SEARCH CONTROLLER (SUPPORT ONLY - NO BUSINESS SEARCH LOGIC)
   ========================================================= */

/**
 * 🚫 DEPRECATED MAIN SEARCH (DISABLED SAFELY)
 * Moved to: businessController.searchBusinesses
 */
export const searchBusinesses = asyncHandler(async (req, res) => {
  return res.status(410).json({
  success: false,
  message: "Search endpoint deprecated. Use /business/search instead.",
  meta: {
    timestamp: new Date().toISOString(),
  },
});
});

/* =========================================================
   AUTOCOMPLETE
   ========================================================= */
export const getAutocompleteSuggestions = asyncHandler(async (req, res) => {
  const q = req.query.q || "";

  if (!q.trim()) {
  return res.json({
    success: true,
    data: [],
    meta: {
      total: 0,
      type: "autocomplete",
      timestamp: new Date().toISOString(),
    },
  });
}

  const escapeRegex = (text) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

  const safeQuery = escapeRegex(q);

const suggestions = await Business.find({
  name: { $regex: safeQuery, $options: "i" },
  status: "approved"
})
    .select("_id name slug")
    .limit(6)
    .lean();

  return res.json({
  success: true,
  data: suggestions,
  meta: {
    total: suggestions.length,
    type: "autocomplete",
    timestamp: new Date().toISOString(),
  },
});
});

/* =========================================================
   TRENDING SEARCHES (KEEP - SIMPLE PLACEHOLDER SAFE)
   ========================================================= */
export const getTrendingSearches = asyncHandler(async (req, res) => {
  // If you already have SearchTrend model logic elsewhere, plug it here
  return res.json({
  success: true,
  data: [],
  meta: {
    total: 0,
    type: "trending",
    timestamp: new Date().toISOString(),
  },
});
});

/* =========================================================
   RECENT SEARCHES (KEEP - SAFE VERSION)
   ========================================================= */
export const getRecentSearches = asyncHandler(async (req, res) => {
  // If user system exists, you can later connect DB here
  return res.json({
  success: true,
  data: [],
  meta: {
    total: 0,
    type: "recent",
    timestamp: new Date().toISOString(),
  },
});
});