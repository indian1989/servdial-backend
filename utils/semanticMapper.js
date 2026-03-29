// backend/utils/semanticMapper.js

const SEMANTIC_MAP = {
  plumber: [
    "water leakage",
    "pipe repair",
    "tap fix",
    "drain problem",
    "bathroom repair",
  ],

  electrician: [
    "light issue",
    "wiring problem",
    "switch repair",
    "fan not working",
  ],

  "ac repair": [
    "cooling problem",
    "ac not cooling",
    "ac service",
    "ac gas refill",
  ],

  salon: [
    "beauty service",
    "hair cut",
    "facial",
    "makeup",
  ],

  doctor: [
    "body pain",
    "fever",
    "health issue",
    "treatment",
  ],
};

/* ================= FIND SEMANTIC MATCH ================= */
export const getSemanticCategory = (keyword = "") => {
  if (!keyword) return null;

  const query = keyword.toLowerCase();

  for (const [category, keywords] of Object.entries(SEMANTIC_MAP)) {
    for (const k of keywords) {
      if (query.includes(k)) {
        return category;
      }
    }
  }

  return null;
};