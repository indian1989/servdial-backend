// backend/utils/semanticMapper.js

/**
 * =========================================================
 * 🧠 SEMANTIC SEARCH MAPPER (FINAL SSOT VERSION)
 * =========================================================
 * RESPONSIBILITY:
 * - semantic category detection
 * - query intent expansion
 * - keyword/category mapping
 *
 * MUST NOT:
 * - access DB
 * - resolve slugs
 * - rank businesses
 * - know routes
 * =========================================================
 */

/* =========================================================
   🔥 CATEGORY SEMANTIC MAP
   ========================================================= */

const SEMANTIC_MAP = {
  plumber: [
    "plumber",
    "water leakage",
    "pipe repair",
    "tap fix",
    "drain problem",
    "bathroom repair",
    "pipe leakage",
    "blocked drain",
    "water pipe",
    "sink repair",
    "toilet repair",
  ],

  electrician: [
    "electrician",
    "light issue",
    "wiring problem",
    "switch repair",
    "fan not working",
    "power issue",
    "short circuit",
    "electric repair",
    "electric problem",
    "wire repair",
    "fan repair",
  ],

  "ac-repair": [
    "ac repair",
    "ac service",
    "cooling problem",
    "ac not cooling",
    "ac gas refill",
    "air conditioner repair",
    "air conditioning",
    "ac mechanic",
    "split ac repair",
  ],

  salon: [
    "salon",
    "beauty service",
    "hair cut",
    "facial",
    "makeup",
    "hair styling",
    "beauty parlour",
    "spa",
    "grooming",
  ],

  doctor: [
    "doctor",
    "body pain",
    "fever",
    "health issue",
    "treatment",
    "clinic",
    "medical",
    "physician",
    "hospital",
  ],
};

/* =========================================================
   🧼 NORMALIZE TEXT
   ========================================================= */

const normalize = (text = "") => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/* =========================================================
   🧠 SEMANTIC CATEGORY DETECTION
   ========================================================= */

export const getSemanticCategory = (
  keyword = ""
) => {
  if (!keyword) return null;

  const query = normalize(keyword);

  // =====================================================
  // PRIORITY 1:
  // exact phrase match
  // =====================================================

  for (const [category, keywords] of Object.entries(
    SEMANTIC_MAP
  )) {
    for (const k of keywords) {
      if (query.includes(normalize(k))) {
        return category;
      }
    }
  }

  // =====================================================
  // PRIORITY 2:
  // token intersection match
  // safer than previous aggressive partial matching
  // =====================================================

  const queryTokens = query.split(" ");

  for (const [category, keywords] of Object.entries(
    SEMANTIC_MAP
  )) {
    for (const k of keywords) {
      const keywordTokens =
        normalize(k).split(" ");

      const matched = keywordTokens.every(
        (token) =>
          queryTokens.includes(token)
      );

      if (matched) {
        return category;
      }
    }
  }

  return null;
};

/* =========================================================
   🚀 OPTIONAL FUTURE EXPORT
   ========================================================= */

export const SEMANTIC_CATEGORIES =
  Object.keys(SEMANTIC_MAP);

export default SEMANTIC_MAP;