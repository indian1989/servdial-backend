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
    { "services.name": { $regex: safeText, $options: "i" } },
{ "services.description": { $regex: safeText, $options: "i" } },
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
      { "services.name": { $regex: safeToken, $options: "i" } },
{ "services.description": { $regex: safeToken, $options: "i" } },
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
   🔎 BUILD BUSINESS-NAME CONDITIONS
========================================================= */

const buildBusinessNameConditions = (
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
     FULL PHRASE — NAME ONLY
  ======================================================= */

  const safeText =
    escapeRegex(text);

  conditions.push({
    name: {
      $regex: safeText,
      $options: "i",
    },
  });

  /* =======================================================
     TOKEN FALLBACK — NAME ONLY
  ======================================================= */

  for (
    const token
    of tokens
  ) {
    const safeToken =
      escapeRegex(token);

    conditions.push({
      name: {
        $regex: safeToken,
        $options: "i",
      },
    });
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

function applyCategoryFilter(query, categoryId, categoryIds) {
  const ids = Array.isArray(categoryIds) && categoryIds.length
    ? categoryIds.filter(Boolean)
    : [];

  if (ids.length) {
    query._servdialCategoryFilter = {
      categoryId: {
        $in: ids,
      },
    };

    return;
  }

  if (categoryId) {
    query._servdialCategoryFilter = {
      categoryId,
    };
  }
};


/* =========================================================
   🔎 APPLY TEXT FILTER
========================================================= */

function applyTextFilter(
  query,
  textSearch,
  {
    nameOnly = false,
  } = {}
) {
  const safeText =
    String(textSearch || "").trim();

  if (!safeText) {
    return;
  }

  const textConditions =
    nameOnly
      ? buildBusinessNameConditions(
          safeText
        )
      : buildTextConditions(
          safeText
        );

  if (!textConditions.length) {
    return;
  }

  query.$and = [
    ...(Array.isArray(query.$and)
      ? query.$and
      : []),
    {
      $or: textConditions,
    },
  ];
}


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
         📍 GEO
      =================================================== */

      applyGeoFilter(
        query,
        filters
      );

      /* ===================================================
         📊 CANDIDATE LIMIT
      =================================================== */

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

      /* ===================================================
   🔎 SEARCH RETRIEVAL
=================================================== */

/*
 * Retrieval strategy:
 *
 * 1. Category candidates
 *    → semantic/category eligibility
 *
 * 2. Name candidates
 *    → business-name matching
 *
 * 3. Text candidates
 *    → service / description / keyword matching
 *
 * IMPORTANT:
 *
 * A business description must NEVER be treated as
 * proof of an exact business-name match.
 *
 * Category and text retrieval are therefore kept
 * as separate candidate pools.
 */

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

const hasText =
  Boolean(
    String(
      textSearch || ""
    ).trim()
  );

const intent =
  String(
    searchContext?.intent ||
      searchContext?.searchIntent ||
      ""
  )
    .trim()
    .toLowerCase();


/* ===================================================
   📦 CANDIDATE POOLS
=================================================== */

let categoryBusinesses = [];

let nameBusinesses = [];

let textBusinesses = [];

/* ===================================================
   🧠 BUSINESS-NAME INTENT
=================================================== */

/*
 * Intent is supplied by Query Intelligence.
 *
 * The search engine does NOT detect intent.
 *
 * We only consume the resolved intent.
 *
 * Supported business-name intent labels cover the
 * common names used by the intent layer.
 */

const isBusinessNameIntent =
  [
    "business_name",
    "business-name",
    "businessname",
    "exact_name",
    "exact-name",
    "exact_business_name",
    "exact-business-name",
    "name",
  ].includes(
    intent
  );

/* ===================================================
   🏷 CATEGORY CANDIDATES
=================================================== */

if (
  hasCategory &&
  query._servdialCategoryFilter
) {
  const categoryQuery = {
    ...query,
    ...query._servdialCategoryFilter,
  };

  delete categoryQuery
    ._servdialCategoryFilter;

  /*
   * Category pool contains ONLY:
   *
   * approved
   * city
   * category
   * geo
   *
   * No description/text condition.
   */

  categoryBusinesses =
    await Business.find(
      categoryQuery
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
}

/* ===================================================
   🏷 BUSINESS-NAME CANDIDATES
=================================================== */

/*
 * Business-name retrieval is ALWAYS name-only.
 *
 * This prevents:
 *
 * Expert Electricals
 *
 * from being discovered merely because the phrase
 * exists somewhere inside another business description.
 */

if (
  hasText
) {
  const nameQuery = {
    ...query,
  };

  delete nameQuery
    ._servdialCategoryFilter;

  applyTextFilter(
    nameQuery,
    textSearch,
    {
      nameOnly: true,
    }
  );

  nameBusinesses =
    await Business.find(
      nameQuery
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
}

/* ===================================================
   🔎 SERVICE / TEXT CANDIDATES
=================================================== */

/*
 * Full text retrieval is used ONLY when:
 *
 * - there is no resolved category, OR
 * - the resolved intent is explicitly a service/text
 *   intent.
 *
 * This prevents a semantic category such as:
 *
 * electrician
 *
 * from turning every description containing:
 *
 * Expert Electricals
 *
 * into a business-name match.
 */

const isServiceIntent =
  [
    "service",
    "service_search",
    "service-search",
    "natural_language",
    "natural-language",
    "natural_language_search",
    "natural-language-search",
    "mixed",
    "general",
    "search",
  ].includes(
    intent
  );

const shouldUseFullText =
  hasText &&
  (
    !hasCategory ||
    isServiceIntent
  );

if (
  shouldUseFullText
) {
  const textQuery = {
    ...query,
  };

  delete textQuery
    ._servdialCategoryFilter;

  applyTextFilter(
    textQuery,
    textSearch,
    {
      nameOnly: false,
    }
  );

  textBusinesses =
    await Business.find(
      textQuery
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
}

/* ===================================================
   🔀 MERGE + DEDUPE
=================================================== */

const businessMap =
  new Map();

/*
 * Priority of insertion:
 *
 * 1. Exact/name candidates
 * 2. Category candidates
 * 3. Full-text candidates
 *
 * This does NOT perform ranking.
 *
 * It only makes sure that if the same business
 * appears in multiple pools, the name candidate
 * representation is retained.
 */

for (
  const business
  of nameBusinesses
) {
  if (
    !business?._id
  ) {
    continue;
  }

  businessMap.set(
    String(
      business._id
    ),
    business
  );
}

for (
  const business
  of categoryBusinesses
) {
  if (
    !business?._id
  ) {
    continue;
  }

  if (
    !businessMap.has(
      String(
        business._id
      )
    )
  ) {
    businessMap.set(
      String(
        business._id
      ),
      business
    );
  }
}

for (
  const business
  of textBusinesses
) {
  if (
    !business?._id
  ) {
    continue;
  }

  if (
    !businessMap.has(
      String(
        business._id
      )
    )
  ) {
    businessMap.set(
      String(
        business._id
      ),
      business
    );
  }
}

const businesses =
  Array.from(
    businessMap.values()
  );

/* ===================================================
   🐛 DEBUG QUERY
=================================================== */

if (
  process.env.NODE_ENV !==
  "production"
) {
  console.log(
    "🔥 SEARCH INTENT:",
    intent
  );

  console.log(
    "🔥 HAS CATEGORY:",
    hasCategory
  );

  console.log(
    "🔥 NAME CANDIDATES:",
    nameBusinesses.length
  );

  console.log(
    "🔥 CATEGORY CANDIDATES:",
    categoryBusinesses.length
  );

  console.log(
    "🔥 TEXT CANDIDATES:",
    textBusinesses.length
  );

  console.log(
    "🔥 MERGED CANDIDATES:",
    businesses.length
  );

  console.log(
    "🔥 SEARCH BASE QUERY:",
    JSON.stringify(
      query,
      null,
      2
    )
  );
}

      /* ===================================================
         🐛 DEBUG QUERY
      =================================================== */

      if (
        process.env.NODE_ENV !==
        "production"
      ) {
        console.log(
          "🔥 CATEGORY CANDIDATES:",
          categoryBusinesses.length
        );

        console.log(
          "🔥 TEXT CANDIDATES:",
          textBusinesses.length
        );

        console.log(
          "🔥 MERGED CANDIDATES:",
          businesses.length
        );

        console.log(
          "🔥 SEARCH BASE QUERY:",
          JSON.stringify(
            query,
            null,
            2
          )
        );
      }


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