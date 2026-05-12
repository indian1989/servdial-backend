// backend/utils/parseSearchIntent.js

/**
 * =========================================================
 * 🧠 PARSE SEARCH INTENT
 * =========================================================
 * RESPONSIBILITY:
 * - extract behavioral filters
 * - clean search query
 * - generate normalized tokens
 *
 * MUST NOT:
 * - resolve DB entities
 * - resolve category
 * - resolve city
 * - perform semantic mapping
 * =========================================================
 */

const STOP_WORDS = [
  "near",
  "nearby",
  "near me",
  "closest",
  "nearest",
  "best",
  "top",
  "cheap",
  "budget",
  "affordable",
  "premium",
  "luxury",
  "open",
  "open now",
  "24x7",
  "24 hour",
  "in",
  "at",
  "around",
  "me",
];

/* =========================================================
   NORMALIZE
========================================================= */
const normalizeQuery = (query = "") =>
  query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/* =========================================================
   REMOVE NOISE WORDS
========================================================= */
const cleanSearchText = (query = "") => {
  let cleaned = normalizeQuery(query);

  STOP_WORDS.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");

    cleaned = cleaned.replace(regex, " ");
  });

  return cleaned
    .replace(/\s+/g, " ")
    .trim();
};

/* =========================================================
   MAIN PARSER
========================================================= */
export const parseSearchIntent = (
  keyword = ""
) => {
  if (!keyword) {
    return {
      rawQuery: "",
      cleanedQuery: "",
      tokens: [],
      sortBy: null,
      minRating: null,
      pricePreference: null,
      openNow: false,
      isNearMe: false,
      isEmergency: false,
    };
  }

  const query = normalizeQuery(keyword);

  const has = (words = []) =>
    words.some((w) => query.includes(w));

  /* =====================================================
     FLAGS
  ===================================================== */

  const openNow = has([
    "open now",
    "24 hour",
    "24x7",
    "always open",
  ]);

  const isNearMe = has([
    "near me",
    "nearby",
    "closest",
    "nearest",
    "around me",
  ]);

  const isEmergency = has([
    "emergency",
    "urgent",
    "immediate",
    "asap",
  ]);

  /* =====================================================
     SORTING
  ===================================================== */

  let sortBy = null;

  if (
    has(["best", "top", "recommended"])
  ) {
    sortBy = "rating";
  }

  if (
    has(["popular", "trending"])
  ) {
    sortBy = "popular";
  }

  /* =====================================================
     RATING
  ===================================================== */

  let minRating = null;

  if (
    has(["best", "top", "high rated"])
  ) {
    minRating = 4;
  }

  /* =====================================================
     PRICE
  ===================================================== */

  let pricePreference = null;

  if (
    has([
      "cheap",
      "budget",
      "affordable",
      "low price",
    ])
  ) {
    pricePreference = "low";
  }

  if (
    has([
      "premium",
      "luxury",
      "high end",
      "expensive",
    ])
  ) {
    pricePreference = "high";
  }

  /* =====================================================
     CLEANED QUERY
  ===================================================== */

  const cleanedQuery = cleanSearchText(query);

  const tokens = cleanedQuery
    .split(" ")
    .filter(Boolean);

  /* =====================================================
     FINAL
  ===================================================== */

  return {
    rawQuery: query,
    cleanedQuery,
    tokens,

    sortBy,
    minRating,
    pricePreference,

    openNow,
    isNearMe,
    isEmergency,
  };
};