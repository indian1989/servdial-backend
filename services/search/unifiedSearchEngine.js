// backend/services/search/unifiedSearchEngine.js

import Business from "../../models/Business.js";
import { rankBusinesses } from "../../utils/rankBusinesses.js";

/**
 * =========================================================
 * 🌍 UNIFIED SEARCH ENGINE — FINAL SSOT VERSION
 * =========================================================
 *
 * RESPONSIBILITY:
 * ---------------------------------------------------------
 * - Execute an already-resolved search context
 * - Build MongoDB business query
 * - Apply city filter
 * - Apply category filter
 * - Apply optional text filter
 * - Apply geo/distance filter
 * - Fetch businesses
 * - Pass candidates to ranking engine
 *
 * MUST NOT:
 * ---------------------------------------------------------
 * - Resolve city
 * - Resolve category
 * - Parse natural-language query
 * - Perform semantic mapping
 * - Detect intent
 * - Rank independently
 * - Contain route/controller logic
 * - Contain UI logic
 *
 * SEARCH FLOW:
 *
 * Request
 *   ↓
 * Search Controller
 *   ↓
 * Query Intelligence Engine
 *   ↓
 * Unified Search Engine
 *   ↓
 * MongoDB Filter
 *   ↓
 * Candidate Businesses
 *   ↓
 * rankBusinesses()
 *   ↓
 * Final Results
 *
 * SSOT RULES:
 *
 * City:
 *   Business.cityId
 *
 * Category:
 *   Business.categoryId
 *
 * Parent Category:
 *   NOT used for business filtering
 *
 * Category expansion:
 *   categoryResolver
 *
 * City resolution:
 *   cityResolver
 *
 * Semantic mapping:
 *   semanticMapper
 *
 * Intent:
 *   intentDetector
 *
 * Ranking:
 *   rankBusinesses
 *
 * =========================================================
 */


/* =========================================================
   🔧 SAFE NUMBER
========================================================= */

const toNumber = (
  value,
  fallback = null
) => {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};


/* =========================================================
   🔧 SAFE LIMIT
========================================================= */

const normalizeLimit = (
  limit = 20
) => {

  const parsed =
    toNumber(
      limit,
      20
    );

  return Math.min(
    Math.max(
      Math.floor(parsed),
      1
    ),
    100
  );
};


/* =========================================================
   🔧 REGEX ESCAPE
========================================================= */

const escapeRegex = (
  value = ""
) => {

  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};


/* =========================================================
   🔧 NORMALIZE TEXT
========================================================= */

const normalizeText = (
  value = ""
) => {

  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ");
};


/* =========================================================
   🔎 BUILD TEXT CONDITIONS
========================================================= */

/**
 * Text is used carefully.
 *
 * If category has already been resolved:
 *
 *   category = plumber
 *   text     = water leakage
 *
 * We do NOT force businesses to literally contain
 * "water leakage".
 *
 * Category filtering already determines eligibility.
 * Text is then supplied to ranking as a relevance signal.
 *
 * If NO category is resolved:
 *
 *   text = "rahul mobile shop"
 *
 * text becomes a MongoDB candidate filter.
 *
 * =========================================================
 */

const buildTextConditions = (
  textSearch = ""
) => {

  const text =
    normalizeText(textSearch);

  if (!text) {
    return [];
  }

  const tokens =
    text
      .split(/\s+/)
      .map(
        (token) =>
          token.trim()
      )
      .filter(Boolean);

  if (!tokens.length) {
    return [];
  }

  const conditions = [];

  /* =======================================================
     FULL PHRASE
  ======================================================= */

  const safeText =
    escapeRegex(text);

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
      keywords: {
        $regex: safeText,
        $options: "i",
      },
    },
    {
      services: {
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

  /* =======================================================
     TOKEN FALLBACK
  ======================================================= */

  for (
    const token
    of tokens
  ) {

    const safeToken =
      escapeRegex(token);

    conditions.push(
      {
        name: {
          $regex: safeToken,
          $options: "i",
        },
      },
      {
        description: {
          $regex: safeToken,
          $options: "i",
        },
      },
      {
        tags: {
          $regex: safeToken,
          $options: "i",
        },
      },
      {
        keywords: {
          $regex: safeToken,
          $options: "i",
        },
      },
      {
        services: {
          $regex: safeToken,
          $options: "i",
        },
      },
      {
        categorySlug: {
          $regex: safeToken,
          $options: "i",
        },
      }
    );
  }

  return conditions;
};


/* =========================================================
   📍 VALIDATE COORDINATES
========================================================= */

const getValidCoordinates = (
  filters = {}
) => {

  const latitude =
    toNumber(
      filters?.lat
    );

  const longitude =
    toNumber(
      filters?.lng
    );

  const valid =
    latitude !== null &&
    longitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  if (!valid) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
};


/* =========================================================
   📍 BUILD GEO FILTER
========================================================= */

/**
 * Returns a MongoDB $near expression.
 *
 * MongoDB expects:
 *
 * distance = meters
 *
 * API/frontend may supply:
 *
 * distance = kilometers
 *
 * Therefore:
 *
 * km × 1000 = meters
 *
 * Maximum supported search radius:
 *
 * 500 km
 */

const buildGeoFilter = (
  filters = {}
) => {

  const coordinates =
    getValidCoordinates(
      filters
    );

  if (!coordinates) {
    return null;
  }

  const requestedDistanceKm =
    toNumber(
      filters?.distance,
      10
    );

  const safeDistanceKm =
    Math.min(
      Math.max(
        requestedDistanceKm,
        0.1
      ),
      500
    );

  return {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [
          coordinates.longitude,
          coordinates.latitude,
        ],
      },
      $maxDistance:
        safeDistanceKm * 1000,
    },
  };
};


/* =========================================================
   🚨 EXPLICIT CITY VALIDATION
========================================================= */

/**
 * IMPORTANT:
 *
 * If user explicitly requested:
 *
 * "electrician in patn"
 *
 * but cityResolver could not resolve "patn",
 * NEVER silently use current detected city.
 *
 * Otherwise:
 *
 * "patn"
 *
 * could accidentally return:
 *
 * "electricians in Hajipur"
 *
 * That is incorrect search behavior.
 */

const hasExplicitCityFailure = (
  searchContext = {}
) => {

  const debug =
    searchContext?.debug || {};

  const requested =
    Boolean(
      debug?.requestedCityCandidate
    );

  const resolved =
    Boolean(
      debug?.resolvedCitySlug
    );

  return (
    requested &&
    !resolved
  );
};


/* =========================================================
   🚨 INVALID SEARCH CONTEXT
========================================================= */

const isInvalidSearchContext = (
  searchContext = {}
) => {

  const debug =
    searchContext?.debug || {};

  return (
    Boolean(
      debug?.invalidCity
    ) ||
    Boolean(
      debug?.invalidCategory
    )
  );
};


/* =========================================================
   🧱 BUILD BASE QUERY
========================================================= */

const buildBaseQuery = () => {

  return {
    status: "approved",
    isDeleted: false,
  };
};


/* =========================================================
   📍 APPLY CITY FILTER
========================================================= */

const applyCityFilter = (
  query,
  cityId
) => {

  if (!cityId) {
    return;
  }

  /*
   * SSOT:
   *
   * Business.cityId
   *
   * Do NOT use:
   *
   * cityName
   * citySlug
   *
   * for primary city filtering.
   */

  query.cityId =
    cityId;
};


/* =========================================================
   🏷 APPLY CATEGORY FILTER
========================================================= */

const applyCategoryFilter = (
  query,
  categoryId,
  categoryIds
) => {

  /*
   * Leaf category IDs have priority.
   *
   * Example:
   *
   * Parent:
   *   Home Services
   *
   * Leaf:
   *   Plumbing
   *   Electrical
   *
   * Search should query:
   *
   * categoryId: {
   *   $in: [...]
   * }
   */

  if (
    Array.isArray(categoryIds) &&
    categoryIds.length > 0
  ) {

    query.categoryId = {
      $in: categoryIds,
    };

    return;
  }

  if (categoryId) {

    query.categoryId =
      categoryId;
  }
};


/* =========================================================
   🔎 APPLY TEXT FILTER
========================================================= */

const applyTextFilter = (
  query,
  textSearch,
  hasCategory
) => {

  const textConditions =
    buildTextConditions(
      textSearch
    );

  if (
    !textConditions.length
  ) {
    return;
  }

  /*
   * IMPORTANT:
   *
   * With resolved category:
   *
   * category determines eligibility
   * text determines relevance/ranking
   *
   * Without category:
   *
   * text must determine candidate eligibility.
   */

  if (!hasCategory) {

    query.$and = [
      {
        $or:
          textConditions,
      },
    ];
  }
};


/* =========================================================
   📍 APPLY GEO FILTER
========================================================= */

const applyGeoFilter = (
  query,
  filters
) => {

  const geoFilter =
    buildGeoFilter(
      filters
    );

  if (!geoFilter) {
    return;
  }

  query.location =
    geoFilter;
};


/* =========================================================
   🧠 PREPARE RANKING CONTEXT
========================================================= */

/**
 * Ranking must receive the complete resolved context.
 *
 * This allows rankBusinesses() to use:
 *
 * - textSearch
 * - rawQuery
 * - intent
 * - sortBy
 * - isNearMe
 * - isEmergency
 * - distance
 * - vectorScore
 * - relevanceScore
 *
 * UnifiedSearchEngine does NOT calculate these signals.
 */

const prepareRankingContext = (
  searchContext = {}
) => {

  return {
    ...searchContext,

    textSearch:
      normalizeText(
        searchContext?.textSearch
      ),

    rawQuery:
      normalizeText(
        searchContext?.rawQuery
      ),

    filters: {
      ...(searchContext?.filters || {}),
    },
  };
};


/* =========================================================
   🔎 MAIN SEARCH ENGINE
========================================================= */

export const unifiedSearchEngine =
  async (
    searchContext = {}
  ) => {

    try {

      /* ===================================================
         CONTEXT
      =================================================== */

      const {
        cityId = null,
        categoryId = null,
        categoryIds = [],
        textSearch = "",
        filters = {},
        limit = 20,
      } = searchContext;


      /* ===================================================
         🚨 EXPLICIT CITY FAILURE
      =================================================== */

      if (
        hasExplicitCityFailure(
          searchContext
        )
      ) {

        console.log(
          "⚠️ EXPLICIT CITY RESOLUTION FAILED:",
          searchContext?.debug
            ?.requestedCityCandidate
        );

        return [];
      }


      /* ===================================================
         🚨 INVALID SEARCH CONTEXT
      =================================================== */

      if (
        isInvalidSearchContext(
          searchContext
        )
      ) {

        console.log(
          "⚠️ INVALID SEARCH CONTEXT"
        );

        return [];
      }


      /* ===================================================
         🧱 BASE QUERY
      =================================================== */

      const query =
        buildBaseQuery();


      /* ===================================================
         📍 CITY
      =================================================== */

      applyCityFilter(
        query,
        cityId
      );


      /* ===================================================
         🏷 CATEGORY
      =================================================== */

      applyCategoryFilter(
        query,
        categoryId,
        categoryIds
      );


      /* ===================================================
         🔎 TEXT
      =================================================== */

      const hasCategory =
        Boolean(
          categoryId
        ) ||
        (
          Array.isArray(
            categoryIds
          ) &&
          categoryIds.length > 0
        );

      applyTextFilter(
        query,
        textSearch,
        hasCategory
      );


      /* ===================================================
         📍 GEO
      =================================================== */

      applyGeoFilter(
        query,
        filters
      );


      /* ===================================================
         🐛 DEBUG QUERY
      =================================================== */

      if (
        process.env.NODE_ENV !==
        "production"
      ) {

        console.log(
          "🔥 SEARCH QUERY:",
          JSON.stringify(
            query,
            null,
            2
          )
        );
      }


      /* ===================================================
         📊 FETCH CANDIDATES
      =================================================== */

      /*
       * Fetch a larger candidate pool than the final limit.
       *
       * Why?
       *
       * Ranking should happen BEFORE final truncation.
       *
       * Example:
       *
       * requested limit = 20
       *
       * Fetch = 100
       *
       * Rank all 100
       *
       * Return best 20.
       */

      const finalLimit =
        normalizeLimit(
          limit
        );

      const candidateLimit =
        Math.min(
          Math.max(
            finalLimit * 5,
            50
          ),
          500
        );


      const businesses =
        await Business.find(
          query
        )

          .populate(
            "cityId",
            "name slug district state"
          )

          .populate(
            "categoryId",
            "name slug parentCategory"
          )

          .limit(
            candidateLimit
          )

          .lean();


      if (
        process.env.NODE_ENV !==
        "production"
      ) {

        console.log(
          "🔥 FOUND CANDIDATES:",
          businesses.length
        );
      }
console.log("🔥🔥🔥 REACHED RANKING SECTION 🔥🔥🔥");

console.log(
  "🔥 BUSINESSES COUNT:",
  businesses?.length
);

console.log(
  "🔥 FIRST BUSINESS ADDRESS:",
  businesses?.[0]?.address
);

      /* ===================================================
         🏆 RANK
      =================================================== */

      const rankingContext =
        prepareRankingContext(
          searchContext
        );

        console.log(
  "🔥 BEFORE RANK ADDRESS:",
  businesses[0]?.address
);

console.log(
  "🔥 BEFORE RANK BUSINESS:",
  businesses[0]
);
      const rankedResults =
        rankBusinesses(
          businesses,
          rankingContext
        );

        console.log(
  "🔥 AFTER RANK ADDRESS:",
  rankedResults[0]?.address
);

console.log(
  "🔥 AFTER RANK BUSINESS:",
  rankedResults[0]
);

      /* ===================================================
         ✂️ FINAL LIMIT
      =================================================== */

      return rankedResults.slice(
        0,
        finalLimit
      );

    } catch (error) {

      console.error(
        "🔥 UNIFIED SEARCH ENGINE ERROR:",
        error
      );

      /*
       * Search failure should not crash
       * the entire API request.
       *
       * Controller can return an empty
       * result set or appropriate response.
       */

      return [];
    }
  };


/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default unifiedSearchEngine;