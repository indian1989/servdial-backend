import asyncHandler from "express-async-handler";

import { buildSearchContext } from "../services/search/queryIntelligenceEngine.js";
import { unifiedSearchEngine } from "../services/search/unifiedSearchEngine.js";

import {
  trackSearch,
} from "../services/analytics/searchTrackingService.js";

/**
 * =========================================================
 * 🔎 UNIFIED SEARCH CONTROLLER
 * =========================================================
 *
 * RESPONSIBILITY:
 * - receive search request
 * - build search context
 * - execute unified search
 * - return results + search metadata
 *
 * MUST NOT:
 * - resolve city directly
 * - resolve category directly
 * - query businesses directly
 * =========================================================
 */

export const unifiedSearch = asyncHandler(async (req, res) => {

  // =====================================================
  // REQUEST PARAMS
  // =====================================================

  const {
    q = "",
    city,
    citySlug,
    categorySlug,
    lat,
    lng,
    distance = 10,
    limit = 20,
    visitorId,
    sessionId,
  } = req.query;


  // =====================================================
  // SEARCH QUERY
  // =====================================================

  const cleanedQuery =
    String(q || "").trim();


  // =====================================================
  // FILTERS
  // =====================================================
  //
  // IMPORTANT:
  //
  // Do NOT resolve city here.
  //
  // queryIntelligenceEngine will decide:
  //
  // 1. explicit city from query
  // 2. citySlug filter
  // 3. city filter
  //
  // Example:
  //
  // "electrician in patn"
  //
  // parser:
  // cityCandidate = "patn"
  //
  // Even if:
  // city = "patna"
  //
  // "patn" MUST win.
  //
  // =====================================================

  const context =
    await buildSearchContext(
      cleanedQuery,
      {

        // Explicit API city slug
        citySlug:
          citySlug || null,

        // Frontend detected city
        city: null,

        categorySlug:
          categorySlug || null,

        lat:
          lat !== undefined
            ? Number(lat)
            : null,

        lng:
          lng !== undefined
            ? Number(lng)
            : null,

        distance:
          Number(distance) || 10,
      }
    );


  // =====================================================
  // INVALID CITY
  // =====================================================

  if (context.cityResolutionFailed) {
try {
  await trackSearch({
    visitorId,
    sessionId,
    user: req.user || null,

    query: cleanedQuery,

    path:
      req.originalUrl?.split("?")[0] ||
      "/search",

    city:
      context.cityId || null,

    category:
      context.categoryId || null,

    citySlug:
      context.citySlug || "",

    categorySlug:
      context.categorySlug || "",

    resultCount: 0,

    filters:
      context.filters || {},

    metadata: {
      intent:
        context.intent || "",

      searchIntent:
        context.searchIntent || "",

      invalidCity: true,
    },
  });
} catch (analyticsError) {
  console.warn(
    "⚠️ Search analytics tracking failed:",
    analyticsError?.message || analyticsError
  );
}

    return res.json({
      success: true,

      data: [],

      meta: {
        total: 0,

        intent:
          context.intent,

        cityId:
          null,

        citySlug:
          context.citySlug || null,

        categoryId:
          context.categoryId || null,

        categorySlug:
          context.categorySlug || null,

        invalidCity:
          true,

        requestedCitySlug:
  context.requestedCitySlug || null,

requestedCityCandidate:
  context.requestedCityCandidate || null,

resolvedCitySlug:
  null,

message:
  `City "${context.requestedCityCandidate || context.requestedCitySlug || context.citySlug}" was not found.`,
      },
    });
  }


  // =====================================================
  // EXECUTION ENGINE
  // =====================================================

  const results =
    await unifiedSearchEngine({
      ...context,

      limit:
        Number(limit) || 20,
    });

    try {
  await trackSearch({
    visitorId,
    sessionId,
    user: req.user || null,

    query: cleanedQuery,

    path:
      req.originalUrl?.split("?")[0] ||
      "/search",

    city:
      context.cityId || null,

    category:
      context.categoryId || null,

    citySlug:
      context.citySlug || "",

    categorySlug:
      context.categorySlug || "",

    resultCount:
      results.length,

    filters:
      context.filters || {},

    metadata: {
      intent:
        context.intent || "",

      searchIntent:
        context.searchIntent || "",
    },
  });
} catch (analyticsError) {
  console.warn(
    "⚠️ Search analytics tracking failed:",
    analyticsError?.message || analyticsError
  );
}

  // =====================================================
  // RESPONSE
  // =====================================================

  return res.json({

    success: true,

    data:
      results,

    meta: {

      total:
        results.length,

      intent:
        context.intent,

      cityId:
        context.cityId || null,

      citySlug:
        context.citySlug || null,

      categoryId:
        context.categoryId || null,

      categorySlug:
        context.categorySlug || null,

      invalidCity:
        context.cityResolutionFailed || false,

      requestedCitySlug:
        context.requestedCitySlug || null,

      requestedCityCandidate:
        context.requestedCityCandidate || null,

      resolvedCitySlug:
  context.citySlug || null,

      cityResolutionFailed:
        context.cityResolutionFailed || false,
    },
  });
});