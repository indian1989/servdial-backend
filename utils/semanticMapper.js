/**
 * =========================================================
 * 🌍 GLOBAL SEMANTIC SEARCH MAPPER
 * =========================================================
 *
 * RESPONSIBILITY:
 * ---------------------------------------------------------
 * - Natural-language search ko semantic category/intent
 *   se map karna
 * - Common aliases, phrases aur service keywords ko
 *   normalize karna
 * - Search query ke liye best semantic category identify
 *   karna
 *
 * MUST NOT:
 * ---------------------------------------------------------
 * - Database access
 * - Category DB resolution
 * - City resolution
 * - Business search
 * - Business ranking
 * - Route awareness
 * - User-specific data
 *
 * IMPORTANT:
 * ---------------------------------------------------------
 * Ye file STATIC semantic intelligence layer hai.
 *
 * DB/category slug resolution:
 *
 * semanticMapper
 *        ↓
 * categoryResolver
 *        ↓
 * MongoDB Category
 *
 * =========================================================
 */


/* =========================================================
   🧼 TEXT NORMALIZATION
========================================================= */

const normalize = (text = "") => {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
};


/* =========================================================
   🔤 TOKENIZATION
========================================================= */

const tokenize = (text = "") => {
  return normalize(text)
    .split(/\s+/)
    .filter(Boolean);
};


/* =========================================================
   🔎 SAFE PHRASE MATCH
========================================================= */

/**
 * Matches complete words / phrases only.
 *
 * Prevents:
 *
 * "spa"
 *
 * from matching:
 *
 * "spare"
 *
 * or another word containing "spa".
 *
 * Also supports:
 *
 * "car repair"
 * "new york"
 * "ac repair"
 */

const phraseMatches = (
  query,
  keyword
) => {

  const normalizedQuery =
    normalize(query);

  const normalizedKeyword =
    normalize(keyword);

  if (
    !normalizedQuery ||
    !normalizedKeyword
  ) {
    return false;
  }

  /* =======================================================
     EXACT QUERY MATCH
  ======================================================= */

  if (
    normalizedQuery ===
    normalizedKeyword
  ) {
    return true;
  }

  /* =======================================================
     WORD-BOUNDARY PHRASE MATCH
  ======================================================= */

  const escaped =
    normalizedKeyword.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  return new RegExp(
    `(?:^|\\s)${escaped}(?=\\s|$)`,
    "iu"
  ).test(
    normalizedQuery
  );
};


/* =========================================================
   🔥 GLOBAL SEMANTIC MAP
========================================================= */

const SEMANTIC_MAP = {

  /* =======================================================
     🔧 HOME / REPAIR SERVICES
  ======================================================= */

  plumber: [
    "plumber",
    "plumbing",
    "plumbing service",
    "pipe repair",
    "pipe leakage",
    "water leakage",
    "water leak",
    "tap repair",
    "tap fix",
    "faucet repair",
    "drain repair",
    "blocked drain",
    "drain blockage",
    "sink repair",
    "toilet repair",
    "bathroom plumbing",
    "water pipe repair",
  ],

  electrician: [
    "electrician",
    "electrical service",
    "electrical repair",
    "electric repair",
    "wiring",
    "wiring repair",
    "wire repair",
    "switch repair",
    "socket repair",
    "fan repair",
    "light repair",
    "light issue",
    "power issue",
    "short circuit",
    "electrical problem",
    "electric problem",
  ],

  "ac-repair": [
    "ac repair",
    "ac service",
    "air conditioner repair",
    "air conditioning repair",
    "air conditioner service",
    "ac mechanic",
    "ac technician",
    "ac not cooling",
    "cooling problem",
    "ac gas refill",
    "air conditioner gas refill",
    "split ac repair",
    "window ac repair",
  ],

  /* =======================================================
     💇 BEAUTY / PERSONAL CARE
  ======================================================= */

  salon: [
    "salon",
    "hair salon",
    "beauty salon",
    "beauty parlour",
    "beauty parlor",
    "parlour",
    "parlor",
    "haircut",
    "hair cut",
    "hair styling",
    "hair style",
    "facial",
    "makeup",
    "beauty service",
    "grooming",
    "spa",
  ],

  /* =======================================================
     🏥 HEALTHCARE
  ======================================================= */

  doctor: [
    "doctor",
    "physician",
    "medical doctor",
    "medical consultation",
    "health consultation",
    "healthcare",
    "health care",
    "medical service",
    "clinic",
    "medical clinic",
    "treatment",
    "fever treatment",
    "body pain",
    "health issue",
  ],

  /* =======================================================
     🚗 AUTOMOTIVE
  ======================================================= */

  mechanic: [
    "mechanic",
    "auto mechanic",
    "car mechanic",
    "vehicle mechanic",
    "automobile repair",
    "auto repair",
    "car repair",
    "vehicle repair",
    "engine repair",
    "garage",
    "car service",
    "vehicle service",
  ],

  "car-wash": [
    "car wash",
    "car washing",
    "vehicle wash",
    "auto wash",
    "car cleaning",
    "vehicle cleaning",
  ],

  /* =======================================================
     🍽️ FOOD / RESTAURANTS
  ======================================================= */

  restaurant: [
    "restaurant",
    "restaurants",
    "food restaurant",
    "dining",
    "dining restaurant",
    "eatery",
    "food place",
    "place to eat",
    "food outlet",
    "local restaurant",
  ],

  cafe: [
    "cafe",
    "café",
    "coffee shop",
    "coffee house",
    "tea cafe",
    "tea shop",
    "coffee place",
  ],

  /* =======================================================
     🏨 HOTEL / STAY
  ======================================================= */

  hotel: [
    "hotel",
    "hotels",
    "accommodation",
    "lodging",
    "place to stay",
    "stay",
    "hotel booking",
    "room booking",
    "guest accommodation",
  ],

  /* =======================================================
     📱 ELECTRONICS
  ======================================================= */

  "mobile-repair": [
    "mobile repair",
    "phone repair",
    "smartphone repair",
    "cell phone repair",
    "mobile service",
    "phone service",
    "iphone repair",
    "android repair",
    "screen replacement",
    "mobile screen repair",
  ],

  "computer-repair": [
    "computer repair",
    "laptop repair",
    "pc repair",
    "desktop repair",
    "computer service",
    "laptop service",
    "notebook repair",
  ],

  /* =======================================================
     🚚 COURIER / LOGISTICS
  ======================================================= */

  courier: [
    "courier",
    "courier service",
    "parcel service",
    "package delivery",
    "parcel delivery",
    "document delivery",
    "local courier",
    "express courier",
  ],

  logistics: [
    "logistics",
    "logistics service",
    "transport service",
    "transportation",
    "freight",
    "cargo service",
    "shipping service",
    "delivery service",
  ],

  /* =======================================================
     🧹 CLEANING
  ======================================================= */

  cleaning: [
    "cleaning",
    "cleaning service",
    "house cleaning",
    "home cleaning",
    "office cleaning",
    "deep cleaning",
    "commercial cleaning",
    "cleaners",
  ],

  /* =======================================================
     ⚖️ LEGAL
  ======================================================= */

  lawyer: [
    "lawyer",
    "advocate",
    "attorney",
    "legal service",
    "legal services",
    "legal consultation",
    "law firm",
    "legal advisor",
    "solicitor",
  ],

  /* =======================================================
     💰 FINANCIAL
  ======================================================= */

  "financial-services": [
    "financial service",
    "financial services",
    "finance",
    "financial advisor",
    "financial consultant",
    "investment advisor",
    "money management",
    "financial consultancy",
  ],

  /* =======================================================
     🏠 REAL ESTATE
  ======================================================= */

  "real-estate": [
    "real estate",
    "property",
    "property dealer",
    "property agent",
    "real estate agent",
    "real estate broker",
    "property consultant",
  ],

};


/* =========================================================
   📊 SEMANTIC CATEGORY LIST
========================================================= */

export const SEMANTIC_CATEGORIES =
  Object.keys(
    SEMANTIC_MAP
  );


/* =========================================================
   🧠 PHRASE MATCH
========================================================= */

/**
 * Priority:
 *
 * 1. Exact phrase
 * 2. Longest complete phrase
 *
 * Example:
 *
 * "car repair service"
 *
 * "car repair"
 * beats
 * "repair"
 */

const getPhraseMatch = (
  query
) => {

  const normalizedQuery =
    normalize(query);

  if (!normalizedQuery) {
    return null;
  }

  let bestMatch = null;
  let bestLength = 0;

  for (
    const [category, keywords]
    of Object.entries(
      SEMANTIC_MAP
    )
  ) {

    for (
      const keyword
      of keywords
    ) {

      const normalizedKeyword =
        normalize(keyword);

      if (!normalizedKeyword) {
        continue;
      }

      /*
       * Exact query/category match.
       */

      if (
        normalizedQuery ===
        normalizedKeyword
      ) {
        return category;
      }

      /*
       * Complete phrase match.
       */

      if (
        phraseMatches(
          normalizedQuery,
          normalizedKeyword
        )
      ) {

        if (
          normalizedKeyword.length >
          bestLength
        ) {

          bestLength =
            normalizedKeyword.length;

          bestMatch =
            category;
        }
      }
    }
  }

  return bestMatch;
};


/* =========================================================
   🧠 TOKEN MATCH
========================================================= */

const getTokenMatch = (
  query
) => {

  const queryTokens =
    new Set(
      tokenize(query)
    );

  if (!queryTokens.size) {
    return null;
  }

  let bestCategory = null;
  let bestScore = 0;

  for (
    const [category, keywords]
    of Object.entries(
      SEMANTIC_MAP
    )
  ) {

    let categoryScore = 0;

    for (
      const keyword
      of keywords
    ) {

      const keywordTokens =
        tokenize(keyword);

      if (
        !keywordTokens.length
      ) {
        continue;
      }

      let matched = 0;

      for (
        const token
        of keywordTokens
      ) {

        if (
          queryTokens.has(token)
        ) {
          matched++;
        }
      }

      /* ===================================================
         COMPLETE PHRASE TOKEN MATCH
      =================================================== */

      if (
        matched ===
        keywordTokens.length
      ) {

        const score =
          keywordTokens.length * 10;

        if (
          score >
          categoryScore
        ) {
          categoryScore =
            score;
        }

        continue;
      }

      /* ===================================================
         SINGLE TOKEN MATCH
      =================================================== */

      if (
        keywordTokens.length === 1 &&
        matched === 1
      ) {

        categoryScore =
          Math.max(
            categoryScore,
            5
          );
      }
    }

    if (
      categoryScore >
      bestScore
    ) {

      bestScore =
        categoryScore;

      bestCategory =
        category;
    }
  }

  return bestCategory;
};


/* =========================================================
   🚀 MAIN SEMANTIC CATEGORY DETECTOR
========================================================= */

export const getSemanticCategory = (
  keyword = ""
) => {

  const query =
    normalize(keyword);

  if (!query) {
    return null;
  }

  /* =======================================================
     PRIORITY 1
     Exact / complete phrase
  ======================================================= */

  const phraseMatch =
    getPhraseMatch(query);

  if (phraseMatch) {
    return phraseMatch;
  }

  /* =======================================================
     PRIORITY 2
     Token matching
  ======================================================= */

  return getTokenMatch(
    query
  );
};


/* =========================================================
   🔍 GET ALL SEMANTIC MATCHES
========================================================= */

/**
 * Useful for future multi-category search.
 *
 * Example:
 *
 * "car ac repair"
 *
 * →
 *
 * [
 *   "mechanic",
 *   "ac-repair"
 * ]
 */

export const getSemanticCategories = (
  keyword = ""
) => {

  const query =
    normalize(keyword);

  if (!query) {
    return [];
  }

  const matches = [];

  for (
    const [category, keywords]
    of Object.entries(
      SEMANTIC_MAP
    )
  ) {

    const matched =
      keywords.some(
        (keyword) =>
          phraseMatches(
            query,
            keyword
          )
      );

    if (matched) {
      matches.push(category);
    }
  }

  return matches;
};


/* =========================================================
   🌍 EXPORT MAP
========================================================= */

export default SEMANTIC_MAP;