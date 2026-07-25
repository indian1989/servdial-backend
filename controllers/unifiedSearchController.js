import asyncHandler from "express-async-handler";

import { buildSearchContext } from "../services/search/queryIntelligenceEngine.js";
import { unifiedSearchEngine } from "../services/search/unifiedSearchEngine.js";

/**
 * =========================================================
 * 🔎 UNIFIED SEARCH CONTROLLER (FINAL SSOT)
 * =========================================================
 */

export const unifiedSearch = asyncHandler(async (req, res) => {
  const {
  q = "",
  city,
  citySlug,
  categorySlug,
  lat,
  lng,
  distance = 10,
  limit = 20,
} = req.query;


const finalCitySlug =
  citySlug || city || null;

  // ================= CLEAN QUERY =================
  // Prevent duplicate city interpretation
  const cleanedQuery = finalCitySlug
  ? q.replace(new RegExp(finalCitySlug, "i"), "").trim()
  : q.trim();

  // ================= CONTEXT BUILD =================
  const context = await buildSearchContext(cleanedQuery, {
    citySlug: finalCitySlug,
    categorySlug: categorySlug || null,
    lat: lat ? Number(lat) : null,
    lng: lng ? Number(lng) : null,
    distance: Number(distance),
  });

  // ================= EXECUTION ENGINE =================
  const results = await unifiedSearchEngine({
    ...context,
    limit: Number(limit),
  });

  // ================= RESPONSE =================
  return res.json({
    success: true,
    data: results,
    meta: {
      total: results.length,
      intent: context.intent,
      cityId: context.cityId,
      categoryId: context.categoryId,
    },
  });
});