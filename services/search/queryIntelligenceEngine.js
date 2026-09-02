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
     CITY INPUT NORMALIZATION
  =======================================================
   *
   * Industry-standard location precedence:
   *
   * 1. Explicit city parsed from the search query
   * 2. Explicit citySlug API filter
   * 3. Detected/current city API filter
   *
   * IMPORTANT:
   *
   * Query location has the highest priority because it
   * represents the user's explicit search intent.
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
   * patna MUST remain the requested city.
   *
   * If the query contains no explicit city, the API
   * location filters may be used as fallback.
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


  /* =======================================================
     EXPLICIT QUERY CITY
  ======================================================= */

  const queryCityCandidate =
    cityCandidate
      ? normalizeSlug(cityCandidate)
      : null;


  /* =======================================================
     FINAL CITY CANDIDATE
  =======================================================
   *
   * Explicit query location always wins.
   *
   * Only when the query does NOT contain a city do we
   * fall back to API-provided location.
   *
   * =======================================================
   */

  if (!queryCityCandidate) {

    cityCandidate =
      requestedCitySlug ||
      requestedCity ||
      null;

  }
  else {

    cityCandidate =
      cityCandidate;

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
    getSemanticCategory(
      safeString(cleanedQuery)
    );

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

  const normalizedCityCandidate =
    normalizeSlug(
      cityCandidate
    );

  city =
    await resolveCity(
      normalizedCityCandidate
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

  /* =======================================================
   EXPLICIT CITY REQUEST DETECTION
=======================================================
 *
 * A city is considered explicitly requested when:
 *
 * 1. Query contains a city candidate
 * 2. citySlug filter is supplied
 * 3. city filter is supplied
 *
 * IMPORTANT:
 *
 * If an explicit city cannot be resolved,
 * search must NOT silently fall back to another city.
 *
 * =======================================================
 */

const explicitCityRequested =
  Boolean(
    queryCityCandidate ||
    requestedCitySlug ||
    requestedCity
  );

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

  /* =====================================================
     CANONICAL CITY
  ===================================================== */

  city:
    city?.slug ||
    null,

  cityId:
    city?._id ||
    null,

  /* =====================================================
     CITY RESOLUTION STATE
  ===================================================== */

  requestedCitySlug:
    requestedCitySlug ||
    null,

  requestedCityCandidate:
    queryCityCandidate ||
    null,

  cityResolutionFailed:
    Boolean(cityResolutionFailed),

  /* =====================================================
     CATEGORY
  ===================================================== */

  categorySlug:
    categorySlug ||
    null,

  /* =====================================================
     GEO
  ===================================================== */

  lat:
    Number.isFinite(latitude)
      ? latitude
      : null,

  lng:
    Number.isFinite(longitude)
      ? longitude
      : null,

  distance,

  /* =====================================================
     BEHAVIORAL SEARCH SIGNALS
  ===================================================== */

  sortBy:
    sortBy || null,

  minRating:
    Number.isFinite(minRating)
      ? minRating
      : null,

  pricePreference:
    pricePreference || null,

  openNow:
    Boolean(openNow),

  isNearMe:
    Boolean(isNearMe),

  isEmergency:
    Boolean(isEmergency),
};

  /* =======================================================
     FINAL CONTEXT
  ======================================================= */

  const context = {
  rawQuery: cleanQuery,

  /* =====================================================
     CANONICAL CITY
  ===================================================== */

  cityId:
    city?._id ||
    null,

  citySlug:
    city?.slug ||
    null,

  /* =====================================================
     REQUESTED CITY
  ===================================================== */

  requestedCitySlug:
    requestedCitySlug ||
    null,

  requestedCityCandidate:
    queryCityCandidate ||
    null,

  /* =====================================================
     CATEGORY
  ===================================================== */

  categoryId,

  categoryIds,

  categorySlug:
    categorySlug ||
    null,

  intent,

  /*
   * =======================================================
   * SEARCH INTELLIGENCE
   * =======================================================
   *
   * This is the canonical location for behavioral
   * search signals.
   */
  searchIntent: {
    sortBy,
    minRating,
    pricePreference,

    openNow,
    isNearMe,
    isEmergency,
  },

  /*
   * =======================================================
   * TEXT SEARCH
   * =======================================================
   */
  textSearch:
    finalTextSearch,

  /*
   * =======================================================
   * FINAL FILTERS
   * =======================================================
   */
  filters:
    finalFilters,

  debug: {
    hasCity:
      !!city,

    hasCategory:
      !!categoryContext,

    requestedCityCandidate:
  queryCityCandidate ||
  null,

requestedCitySlug:
  requestedCitySlug ||
  null,

resolvedCitySlug:
  city?.slug ||
  null,

cityResolutionFailed:
  Boolean(cityResolutionFailed),

    requestedCategorySlug:
      categorySlug ||
      null,

    resolvedCategorySlug:
      categoryContext?.category?.slug ||
      null,

    semanticCategory:
      semanticCategory ||
      null,

    /*
     * Useful for future semantic ranking.
     */
    semanticMatched:
      !!semanticCategory,

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

      /* =================================================
         CITY
      ================================================= */

      requestedCityCandidate:
        context.requestedCityCandidate,

      requestedCitySlug:
        context.requestedCitySlug,

      cityId:
        context.cityId,

      citySlug:
        context.citySlug,

      cityResolutionFailed:
        context.debug
          .cityResolutionFailed,

      /* =================================================
         CATEGORY
      ================================================= */

      categoryId:
        context.categoryId,

      categoryIds:
        context.categoryIds,

      categorySlug:
        context.categorySlug,

      /* =================================================
         INTENT
      ================================================= */

      intent:
        context.intent,

      searchIntent:
        context.searchIntent,

      /* =================================================
         TEXT
      ================================================= */

      textSearch:
        context.textSearch,

    },
    null,
    2
  )
);

  return context;
};