// backend/utils/parseSearchIntent.js
/**
 * =========================================================
 * 🧠 PARSE SEARCH INTENT
 * =========================================================
 *
 * RESPONSIBILITY:
 * - Normalize user search query
 * - Extract city candidate from natural language
 * - Extract behavioral/search filters
 * - Remove resolved city phrase from text query
 * - Generate normalized search tokens
 *
 * MUST NOT:
 * - Query database
 * - Resolve city
 * - Resolve category
 * - Perform semantic category mapping
 * - Rank businesses
 *
 * WORLDWIDE EXAMPLES:
 *
 * "electrician in patna"
 * → cityCandidate: "patna"
 *
 * "restaurant in new delhi"
 * → cityCandidate: "new delhi"
 *
 * "plumber near san francisco"
 * → cityCandidate: "san francisco"
 *
 * "doctor at new york"
 * → cityCandidate: "new york"
 *
 * "hotel in united kingdom"
 * → cityCandidate: "united kingdom"
 *
 * "plumber near me"
 * → cityCandidate: null
 * → isNearMe: true
 *
 * "best salon in patna"
 * → cityCandidate: "patna"
 * → sortBy: "rating"
 * → minRating: 4
 *
 * =========================================================
 */

/* =========================================================
   STOP / NOISE WORDS
========================================================= */

const STOP_WORDS = [
  // Location connectors
  "in",
  "at",
  "near",
  "around",
  "nearby",

  // Proximity
  "near me",
  "around me",
  "closest",
  "nearest",

  // Quality
  "best",
  "top",
  "recommended",
  "popular",
  "trending",
  "high rated",
  "highest rated",

  // Price
  "cheap",
  "budget",
  "affordable",
  "low price",
  "lowest price",
  "premium",
  "luxury",
  "high end",
  "expensive",

  // Availability
  "open",
  "open now",
  "24x7",
  "24 hour",
  "24 hours",
  "always open",
  "emergency",
"urgent",
"immediate",
"asap",

  // Personal/location noise
  "me",
];

/* =========================================================
   REGEX ESCAPE
========================================================= */

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* =========================================================
   NORMALIZE QUERY
========================================================= */

const normalizeQuery = (query = "") =>
  String(query)
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/* =========================================================
   NORMALIZE CITY CANDIDATE
========================================================= */

const normalizeCityCandidate = (value = "") =>
  String(value)
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^-+|-+$/g, "")
    .trim();

/* =========================================================
   EXTRACT CITY CANDIDATE
========================================================= */

/**
 * Extracts the trailing location phrase after:
 *
 * - in
 * - at
 * - near
 *
 * IMPORTANT:
 * Only the END of the query is considered.
 *
 * This prevents:
 *
 * "near me plumber"
 *
 * from incorrectly treating "me plumber" as a city.
 *
 * Supports:
 *
 * "in patna"
 * "in new delhi"
 * "in san francisco"
 * "near los angeles"
 * "at united arab emirates"
 */

const extractCityCandidate = (query = "") => {
  const normalized = normalizeQuery(query);

  if (!normalized) {
    return null;
  }

  /*
   * Location phrases are intentionally restricted
   * to the end of the query.
   *
   * Supported:
   *
   * in patna
   * at patna
   * near patna
   * around patna
   *
   * We also allow "near me" / "around me" separately
   * without treating them as a city.
   */

  const match = normalized.match(
    /\b(?:in|at|near|around)\s+([\p{L}\p{N}][\p{L}\p{N}\s-]*[\p{L}\p{N}])$/iu
  );

  if (!match) {
    return null;
  }

  const candidate =
    normalizeCityCandidate(match[1]);

  if (!candidate) {
    return null;
  }

  const invalidCandidates = new Set([
    "me",
    "myself",
    "here",
    "near me",
    "around me",
    "nearby",
  ]);

  if (
    invalidCandidates.has(
      candidate.toLowerCase()
    )
  ) {
    return null;
  }

  return candidate;
};

/* =========================================================
   REMOVE CITY PHRASE
========================================================= */

const removeCityPhrase = (
  query = "",
  cityCandidate = null
) => {
  const normalizedQuery =
    normalizeQuery(query);

  if (!normalizedQuery) {
    return "";
  }

  /*
   * No resolved/extracted city:
   *
   * Nothing to remove.
   */
  if (!cityCandidate) {
    return normalizedQuery;
  }

  const normalizedCity =
    normalizeCityCandidate(
      cityCandidate
    );

  if (!normalizedCity) {
    return normalizedQuery;
  }

  const escapedCity =
    escapeRegex(normalizedCity);

  return normalizedQuery
    .replace(
      new RegExp(
        `\\b(?:in|at|near|around)\\s+${escapedCity}\\s*$`,
        "iu"
      ),
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
};

/* =========================================================
   WORD / PHRASE MATCH
========================================================= */

const containsPhrase = (
  query = "",
  phrase = ""
) => {
  if (!query || !phrase) {
    return false;
  }

  const normalizedQuery = normalizeQuery(query);
  const normalizedPhrase = normalizeQuery(phrase);

  if (!normalizedPhrase) {
    return false;
  }

  return normalizedQuery.includes(normalizedPhrase);
};

/* =========================================================
   REMOVE NOISE WORDS
========================================================= */

const cleanSearchText = (
  query = "",
  cityCandidate = null
) => {
  let cleaned = removeCityPhrase(
    query,
    cityCandidate
  );

  /*
   * Remove longer phrases first.
   *
   * Example:
   * "near me" must be removed before "near"
   * and "me" individually.
   */

  const sortedStopWords = [...STOP_WORDS].sort(
    (a, b) => b.length - a.length
  );

  for (const word of sortedStopWords) {
    const escapedWord = escapeRegex(
      normalizeQuery(word)
    );

    if (!escapedWord) {
      continue;
    }

    cleaned = cleaned.replace(
      new RegExp(
        `(?:^|\\s)${escapedWord}(?=\\s|$)`,
        "giu"
      ),
      " "
    );
  }

  return cleaned
    .replace(/\s+/g, " ")
    .trim();
};

/* =========================================================
   TOKENIZE
========================================================= */

const tokenize = (text = "") => {
  return normalizeQuery(text)
    .split(/\s+/)
    .filter(Boolean);
};

/* =========================================================
   MAIN PARSER
========================================================= */

export const parseSearchIntent = (
  keyword = ""
) => {
  /* =======================================================
     EMPTY SAFETY
  ======================================================= */

  if (!keyword) {
    return {
      rawQuery: "",
      cleanedQuery: "",
      tokens: [],

      cityCandidate: null,

      sortBy: null,
      minRating: null,
      pricePreference: null,

      openNow: false,
      isNearMe: false,
      isEmergency: false,
    };
  }

  /* =======================================================
     NORMALIZE
  ======================================================= */

  const query = normalizeQuery(keyword);

  if (!query) {
    return {
      rawQuery: "",
      cleanedQuery: "",
      tokens: [],

      cityCandidate: null,

      sortBy: null,
      minRating: null,
      pricePreference: null,

      openNow: false,
      isNearMe: false,
      isEmergency: false,
    };
  }

  /* =======================================================
     CITY
  ======================================================= */

  const cityCandidate =
    extractCityCandidate(query);

  /* =======================================================
     PROXIMITY
  ======================================================= */

  const isNearMe =
    containsPhrase(query, "near me") ||
    containsPhrase(query, "around me") ||
    containsPhrase(query, "nearby") ||
    containsPhrase(query, "closest") ||
    containsPhrase(query, "nearest");

  /* =======================================================
     OPEN NOW
  ======================================================= */

  const openNow =
    containsPhrase(query, "open now") ||
    containsPhrase(query, "24x7") ||
    containsPhrase(query, "24 hour") ||
    containsPhrase(query, "24 hours") ||
    containsPhrase(query, "always open");

  /* =======================================================
     EMERGENCY
  ======================================================= */

  const isEmergency =
    containsPhrase(query, "emergency") ||
    containsPhrase(query, "urgent") ||
    containsPhrase(query, "immediate") ||
    containsPhrase(query, "asap");

  /* =======================================================
     SORTING
  ======================================================= */

  let sortBy = null;

  if (
    containsPhrase(query, "best") ||
    containsPhrase(query, "top") ||
    containsPhrase(query, "recommended") ||
    containsPhrase(query, "high rated") ||
    containsPhrase(query, "highest rated")
  ) {
    sortBy = "rating";
  }

  if (
    containsPhrase(query, "popular") ||
    containsPhrase(query, "trending")
  ) {
    sortBy = "popular";
  }

  /* =======================================================
     MINIMUM RATING
  ======================================================= */

  let minRating = null;

  if (
    containsPhrase(query, "best") ||
    containsPhrase(query, "top") ||
    containsPhrase(query, "high rated") ||
    containsPhrase(query, "highest rated")
  ) {
    minRating = 4;
  }

  /* =======================================================
     PRICE PREFERENCE
  ======================================================= */

  let pricePreference = null;

  if (
    containsPhrase(query, "cheap") ||
    containsPhrase(query, "budget") ||
    containsPhrase(query, "affordable") ||
    containsPhrase(query, "low price") ||
    containsPhrase(query, "lowest price")
  ) {
    pricePreference = "low";
  }

  if (
    containsPhrase(query, "premium") ||
    containsPhrase(query, "luxury") ||
    containsPhrase(query, "high end") ||
    containsPhrase(query, "expensive")
  ) {
    pricePreference = "high";
  }

  /* =======================================================
     CLEAN SEARCH TEXT
  ======================================================= */

  const cleanedQuery =
    cleanSearchText(
      query,
      cityCandidate
    );

  /* =======================================================
     TOKENS
  ======================================================= */

  const tokens =
    tokenize(cleanedQuery);

  /* =======================================================
     FINAL RESULT
  ======================================================= */

  return {
    rawQuery: query,

    cleanedQuery,

    tokens,

    /*
     * Candidate only.
     *
     * IMPORTANT:
     * This is NOT a resolved City document.
     *
     * Database resolution happens later
     * inside cityResolver.js.
     */
    cityCandidate,

    sortBy,
    minRating,
    pricePreference,

    openNow,
    isNearMe,
    isEmergency,
  };
};

/* =========================================================
   OPTIONAL NAMED EXPORTS
========================================================= */

export {
  normalizeQuery,
  extractCityCandidate,
  removeCityPhrase,
  cleanSearchText,
  tokenize,
};