import asyncHandler from "express-async-handler";

import { buildSearchContext } from "../services/search/queryIntelligenceEngine.js";
import { unifiedSearchEngine } from "../services/search/unifiedSearchEngine.js";

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
        city:
          city || null,

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

  if (context.debug?.invalidCity) {

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
          context.debug?.requestedCitySlug || null,

        requestedCityCandidate:
          context.debug?.requestedCityCandidate || null,

        resolvedCitySlug:
          null,

        message:
          `City "${context.debug?.requestedCityCandidate || context.citySlug}" was not found.`,
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
        context.debug?.invalidCity || false,

      requestedCitySlug:
        context.debug?.requestedCitySlug || null,

      requestedCityCandidate:
        context.debug?.requestedCityCandidate || null,

      resolvedCitySlug:
        context.debug?.resolvedCitySlug || null,

      cityResolutionFailed:
        context.cityResolutionFailed || false,
    },
  });
});