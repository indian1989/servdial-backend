// backend/services/search/unifiedSearchEngine.js

import Business from "../../models/Business.js";
import { rankBusinesses } from "../../utils/rankBusinesses.js";

/*
=========================================================
🔎 UNIFIED SEARCH ENGINE
=========================================================

RESPONSIBILITY:

- execute already-resolved search context
- build MongoDB business query
- apply city/category/text/geo filters
- fetch businesses
- pass results to ranking layer

MUST NOT:

- resolve city
- resolve category
- parse natural-language query
- perform semantic mapping
- contain route logic
- contain UI logic

SEARCH FLOW:

Request
   ↓
Search Controller
   ↓
Query Intelligence Engine
   ↓
Unified Search Engine  ← THIS FILE
   ↓
Rank Businesses
   ↓
Results

=========================================================
*/


/* =========================================================
   🔧 SAFE NUMBER
========================================================= */

const toNumber = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};


/* =========================================================
   🔧 SAFE LIMIT
========================================================= */

const normalizeLimit = (limit = 20) => {
  const parsed = toNumber(limit, 20);

  return Math.min(
    Math.max(parsed, 1),
    100
  );
};


/* =========================================================
   🔧 BUILD TEXT CONDITIONS
========================================================= */

const buildTextConditions = (textSearch = "") => {
  const text = String(textSearch || "")
    .trim();

  if (!text) {
    return [];
  }

  const tokens = text
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  /*
  ---------------------------------------------------------
  IMPORTANT:
  Escape regex input.

  User search must NEVER become an unsafe
  MongoDB regex expression.
  ---------------------------------------------------------
  */

  const escapeRegex = (value = "") =>
    value.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  const conditions = [];

  /* =====================================================
     FULL QUERY MATCH
  ===================================================== */

  const safeText = escapeRegex(text);

  conditions.push(
    {
      name: {
        $regex: safeText,
        $options: "i",
      },
    },
    {
      description: {
        $regex: safeText,
        $options: "i",
      },
    },
    {
      tags: {
        $regex: safeText,
        $options: "i",
      },
    },
    {
      categorySlug: {
        $regex: safeText,
        $options: "i",
      },
    }
  );

  /* =====================================================
     TOKEN FALLBACK
     
     Example:

     "mobile phone repair"

     can still match:

     mobile repair shop
     phone service
  ===================================================== */

  for (const token of tokens) {
    const safeToken = escapeRegex(token);

    conditions.push({
      name: {
        $regex: safeToken,
        $options: "i",
      },
    });

    conditions.push({
      tags: {
        $regex: safeToken,
        $options: "i",
      },
    });

    conditions.push({
      categorySlug: {
        $regex: safeToken,
        $options: "i",
      },
    });
  }

  return conditions;
};


/* =========================================================
   🔎 MAIN SEARCH ENGINE
========================================================= */

export const unifiedSearchEngine = async (
  searchContext = {}
) => {

  /*
  =========================================================
  CONTEXT
  =========================================================
  */

  const {
    cityId = null,
    categoryId = null,
    categoryIds = [],
    textSearch = "",
    filters = {},
    limit = 20,
    debug = {},
  } = searchContext;


  /*
  =========================================================
  🚨 EXPLICIT CITY FAILURE
  =========================================================

  Example:

  "electrician in patn"

  parser:
  cityCandidate = "patn"

  resolver:
  city = null

  We MUST NOT silently fall back to the
  user's current city.

  Otherwise:

  "electrician in patn"

  could incorrectly return:

  "electricians in hajipur"

  =========================================================
  */

  const explicitCityRequested =
    Boolean(
      debug?.requestedCityCandidate
    );


  const cityResolutionFailed =
    explicitCityRequested &&
    !debug?.resolvedCitySlug;


  if (cityResolutionFailed) {

    console.log(
      "⚠️ EXPLICIT CITY RESOLUTION FAILED:",
      debug.requestedCityCandidate
    );

    return [];
  }


  /*
  =========================================================
  🚨 INVALID CITY
  =========================================================
  */

  if (debug?.invalidCity) {

    console.log(
      "⚠️ INVALID CITY SEARCH"
    );

    return [];
  }


  /*
  =========================================================
  🧱 BASE QUERY
  =========================================================
  */

  const query = {

    status: "approved",

    isDeleted: false,

  };


  /*
  =========================================================
  📍 CITY FILTER
  =========================================================

  SSOT:

  Business.cityId

  We intentionally do NOT use:

  - cityName
  - citySlug

  for the primary city filter.

  =========================================================
  */

  if (cityId) {

    query.cityId = cityId;

  }


  /*
  =========================================================
  🏷 CATEGORY FILTER
  =========================================================

  Leaf categories are preferred.

  Example:

  category = "repair-services"

  categoryIds =
  [mobile-repair-id, laptop-repair-id, ...]
  =========================================================
  */

  if (
    Array.isArray(categoryIds) &&
    categoryIds.length > 0
  ) {

    query.categoryId = {
      $in: categoryIds,
    };

  } else if (categoryId) {

    query.categoryId = categoryId;

  }


  /*
  =========================================================
  🔎 TEXT SEARCH
  =========================================================
  */

  const textConditions =
    buildTextConditions(textSearch);


  if (textConditions.length > 0) {

    query.$and = [
      {
        $or: textConditions,
      },
    ];

  }


  /*
  =========================================================
  📍 GEO SEARCH
  =========================================================

  MongoDB GeoJSON:

  coordinates:

  [
    longitude,
    latitude
  ]

  distance is supplied in KM by frontend/API.

  MongoDB requires meters.

  =========================================================
  */

  const latitude =
    toNumber(filters?.lat);

  const longitude =
    toNumber(filters?.lng);


  const distanceKm =
    toNumber(
      filters?.distance,
      10
    );


  const validCoordinates =
    latitude !== null &&
    longitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;


  if (validCoordinates) {

    const safeDistanceKm =
      Math.min(
        Math.max(distanceKm, 0.1),
        500
      );


    query.location = {

      $near: {

        $geometry: {

          type: "Point",

          coordinates: [
            longitude,
            latitude,
          ],

        },

        $maxDistance:
          safeDistanceKm * 1000,

      },

    };

  }


  /*
  =========================================================
  🐛 DEBUG
  =========================================================
  */

  console.log(
    "🔥 SEARCH QUERY:",
    JSON.stringify(
      query,
      null,
      2
    )
  );


  /*
  =========================================================
  📊 FETCH BUSINESSES
  =========================================================
  */

  const businesses =
    await Business.find(query)

      .populate(
        "cityId",
        "name slug district state"
      )

      .populate(
        "categoryId",
        "name slug parentCategory"
      )

      .limit(
        normalizeLimit(limit)
      )

      .lean();


  console.log(
    "🔥 FOUND BUSINESSES:",
    businesses.length
  );


  /*
  =========================================================
  🏆 RANK RESULTS
  =========================================================

  Ranking is intentionally kept outside
  this search engine.

  This makes the architecture:

  FILTER → FETCH → RANK

  =========================================================
  */

  const rankedResults =
    rankBusinesses(
      businesses,
      searchContext
    );


  /*
  =========================================================
  ✅ FINAL RESULT
  =========================================================
  */

  return rankedResults;
};


/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default unifiedSearchEngine;