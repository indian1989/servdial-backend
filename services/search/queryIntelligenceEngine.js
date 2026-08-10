// backend/services/search/queryIntelligenceEngine.js

import { resolveCity } from "../resolver/cityResolver.js";
import { resolveCategoryContext } from "../resolver/categoryResolver.js";

import { detectIntent } from "../../utils/intentDetector.js";
import { parseSearchIntent } from "../../utils/parseSearchIntent.js";
import { getSemanticCategory } from "../../utils/semanticMapper.js";

/**
 * =========================================================
 * 🧠 BUILD SEARCH CONTEXT
 * =========================================================
 *
 * RESPONSIBILITY:
 *
 * - Understand search query
 * - Detect search intent
 * - Parse behavioral filters
 * - Extract city candidate
 * - Resolve city
 * - Resolve category
 * - Apply semantic category mapping
 * - Build normalized search context
 *
 * MUST NOT:
 *
 * - Query businesses
 * - Rank businesses
 * - Perform business filtering
 * - Contain semantic dictionaries
 * - Know frontend routes
 *
 * FLOW:
 *
 * User Query
 *     ↓
 * detectIntent()
 *     ↓
 * parseSearchIntent()
 *     ↓
 * city resolution
 *     ↓
 * category resolution
 *     ↓
 * semantic category
 *     ↓
 * normalized search context
 *
 * =========================================================
 */

/* =========================================================
   SAFE STRING
========================================================= */

const safeString = (value = "") =>
  String(value ?? "").trim();

/* =========================================================
   NORMALIZE SLUG
========================================================= */

const normalizeSlug = (value = "") =>
  safeString(value)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");

/* =========================================================
   BUILD SEARCH CONTEXT
========================================================= */

export const buildSearchContext = async (
  query = "",
  filters = {}
) => {
  const cleanQuery =
    safeString(query);

  const normalizedFilters =
    filters && typeof filters === "object"
      ? filters
      : {};

  /* =======================================================
     EMPTY SAFETY
  ======================================================= */

  if (
    !cleanQuery &&
    Object.keys(normalizedFilters).length === 0
  ) {
    return {
      rawQuery: "",

      cityId: null,
      citySlug: null,

      categoryId: null,
      categoryIds: [],
      categorySlug: null,

      intent: {
        type: "default",
        score: 0,
        scores: {},
      },

      textSearch: "",

      filters: {},

      debug: {
        empty: true,

        hasCity: false,
        hasCategory: false,

        requestedCityCandidate: null,
        resolvedCitySlug: null,

        requestedCitySlug: null,

        requestedCategorySlug: null,
        resolvedCategorySlug: null,

        semanticCategory: null,

        cityResolutionFailed: false,

        parsed: null,
      },
    };
  }

  /* =======================================================
     INTENT
  ======================================================= */

  const intent =
    detectIntent(cleanQuery);

  /* =======================================================
     PARSE QUERY
  ======================================================= */

  const parsed =
    parseSearchIntent(cleanQuery);

  let {
    cityCandidate,
    cleanedQuery,
    tokens,

    sortBy,
    minRating,
    pricePreference,

    openNow,
    isNearMe,
    isEmergency,
  } = parsed;

  /* =======================================================
     CITY FROM API FILTER
  =======================================================
   *
   * Priority:
   *
   * 1. Explicit city in search query
   * 2. citySlug API filter
   * 3. city API filter
   *
   * Example:
   *
   * Query:
   * "electrician in patna"
   *
   * API:
   * city = hajipur
   *
   * Result:
   * patna MUST win.
   *
   * =======================================================
   */

  const requestedCitySlug =
    normalizedFilters.citySlug
      ? normalizeSlug(
          normalizedFilters.citySlug
        )
      : null;

  const requestedCity =
    normalizedFilters.city
      ? normalizeSlug(
          typeof normalizedFilters.city === "object"
            ? normalizedFilters.city?.slug
            : normalizedFilters.city
        )
      : null;

  /*
   * Query city always gets priority.
   */

  if (!cityCandidate) {
    cityCandidate =
      requestedCitySlug ||
      requestedCity ||
      null;
  }

  /* =======================================================
     CATEGORY FILTER
  ======================================================= */

  let categorySlug =
    normalizedFilters.categorySlug
      ? normalizeSlug(
          normalizedFilters.categorySlug
        )
      : null;

  if (!categorySlug && normalizedFilters.category) {
    categorySlug =
      normalizeSlug(
        typeof normalizedFilters.category === "object"
          ? normalizedFilters.category?.slug
          : normalizedFilters.category
      );
  }

  /* =======================================================
     SEMANTIC CATEGORY
  =======================================================
   *
   * Explicit category filter wins.
   *
   * Otherwise semantic mapping may infer:
   *
   * "water leakage"
   *     ↓
   * plumber
   *
   * "fan not working"
   *     ↓
   * electrician
   *
   * =======================================================
   */

  let semanticCategory = null;

  if (!categorySlug) {
    semanticCategory =
      getSemanticCategory(cleanQuery);

    if (semanticCategory) {
      categorySlug =
        normalizeSlug(
          semanticCategory
        );
    }
  }

  /* =======================================================
     RESOLVE CITY
  ======================================================= */

  let city = null;

  if (cityCandidate) {
    city =
      await resolveCity(
        cityCandidate
      );
  }

  /*
   * IMPORTANT:
   *
   * If user explicitly requested a city and
   * resolver cannot find it, we must preserve
   * that failure.
   *
   * The search engine will return zero results
   * instead of silently falling back to the
   * user's current city.
   */

  const explicitCityRequested =
    !!parsed.cityCandidate ||
    !!requestedCitySlug ||
    !!requestedCity;

  const cityResolutionFailed =
    explicitCityRequested &&
    !city;

  /* =======================================================
     RESOLVE CATEGORY
  ======================================================= */

  let categoryContext = null;

  if (categorySlug) {
    categoryContext =
      await resolveCategoryContext(
        categorySlug
      );
  }

  /* =======================================================
     CATEGORY IDS
  ======================================================= */

  const categoryId =
    categoryContext?.primaryCategoryId ||
    null;

  const categoryIds =
    Array.isArray(
      categoryContext?.leafCategoryIds
    )
      ? categoryContext.leafCategoryIds
      : [];

  /* =======================================================
     FINAL TEXT SEARCH
  =======================================================
   *
   * parseSearchIntent() has already removed:
   *
   * - city phrase
   * - location connectors
   * - behavioral noise
   *
   * We should NOT aggressively remove category
   * words here because the search engine may use
   * them for text matching.
   *
   * Example:
   *
   * "water leakage in patna"
   *
   * parser:
   * cityCandidate = patna
   * cleanedQuery = water leakage
   *
   * final textSearch:
   * water leakage
   *
   * =======================================================
   */

  let finalTextSearch =
    safeString(cleanedQuery);

  /* =======================================================
     FALLBACK TEXT SEARCH
  ======================================================= */

  if (!finalTextSearch && Array.isArray(tokens)) {
    finalTextSearch =
      tokens.join(" ").trim();
  }

  /* =======================================================
     GEO FILTERS
  ======================================================= */

  const latitude =
    normalizedFilters.lat !== undefined &&
    normalizedFilters.lat !== null &&
    normalizedFilters.lat !== ""
      ? Number(normalizedFilters.lat)
      : null;

  const longitude =
    normalizedFilters.lng !== undefined &&
    normalizedFilters.lng !== null &&
    normalizedFilters.lng !== ""
      ? Number(normalizedFilters.lng)
      : null;

  const requestedDistance =
    normalizedFilters.distance !== undefined &&
    normalizedFilters.distance !== null &&
    normalizedFilters.distance !== ""
      ? Number(normalizedFilters.distance)
      : 10;

  const distance =
    Number.isFinite(requestedDistance) &&
    requestedDistance > 0
      ? requestedDistance
      : 10;

  /* =======================================================
     FINAL FILTERS
  ======================================================= */

  const finalFilters = {
    ...normalizedFilters,

    city:
      city?.slug ||
      null,

    cityId:
      city?._id ||
      null,

    categorySlug:
      categorySlug ||
      null,

    lat:
      Number.isFinite(latitude)
        ? latitude
        : null,

    lng:
      Number.isFinite(longitude)
        ? longitude
        : null,

    distance,
  };

  /* =======================================================
     FINAL CONTEXT
  ======================================================= */

  const context = {
    rawQuery: cleanQuery,

    cityId:
      city?._id ||
      null,

    citySlug:
      city?.slug ||
      null,

    categoryId,

    categoryIds,

    categorySlug:
      categorySlug ||
      null,

    intent,

    /*
     * Behavioral search information remains
     * available to ranking / search execution.
     */
    searchIntent: {
      sortBy,
      minRating,
      pricePreference,

      openNow,
      isNearMe,
      isEmergency,
    },

    textSearch:
      finalTextSearch,

    filters:
      finalFilters,

    debug: {
      hasCity:
        !!city,

      hasCategory:
        !!categoryContext,

      requestedCityCandidate:
        parsed.cityCandidate ||
        null,

      requestedCitySlug:
        requestedCitySlug ||
        null,

      resolvedCitySlug:
        city?.slug ||
        null,

      cityResolutionFailed,

      requestedCategorySlug:
        categorySlug ||
        null,

      resolvedCategorySlug:
        categoryContext?.category?.slug ||
        null,

      semanticCategory:
        semanticCategory ||
        null,

      parsed,

      tokens,

      finalTextSearch,
    },
  };

  /* =======================================================
     DEBUG
  ======================================================= */

  console.log(
    "🔥 SEARCH CONTEXT:",
    JSON.stringify(
      {
        rawQuery:
          context.rawQuery,

        cityId:
          context.cityId,

        citySlug:
          context.citySlug,

        categoryId:
          context.categoryId,

        categoryIds:
          context.categoryIds,

        categorySlug:
          context.categorySlug,

        intent:
          context.intent,

        searchIntent:
          context.searchIntent,

        textSearch:
          context.textSearch,

        cityResolutionFailed:
          context.debug
            .cityResolutionFailed,
      },
      null,
      2
    )
  );

  return context;
};