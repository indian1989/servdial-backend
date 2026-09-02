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
    "plumbers",
    "plumbing",
    "plumbing service",
    "plumbing services",
    "plumbing work",
    "plumbing contractor",
    "plumbing contractors",
    "pipe repair",
    "pipe leakage",
    "pipe leak",
    "water leakage",
    "water leak",
    "water pipe repair",
    "tap repair",
    "tap fix",
    "faucet repair",
    "faucet fix",
    "drain repair",
    "drain cleaning",
    "blocked drain",
    "drain blockage",
    "sink repair",
    "sink leakage",
    "toilet repair",
    "toilet plumbing",
    "bathroom plumbing",
    "bathroom pipe repair",
    "kitchen plumbing",
    "water line repair",
    "water tank plumbing",
  ],

  electrician: [
    "electrician",
    "electricians",
    "electrical",
    "electricals",
    "electric",
    "electrical service",
    "electrical services",
    "electric service",
    "electric services",
    "electrician service",
    "electrician services",
    "electrical work",
    "electrical works",
    "electrical contractor",
    "electrical contractors",
    "electrical repair",
    "electrical repairs",
    "electric repair",
    "electric repairs",
    "electrical installation",
    "electrical installations",
    "electric installation",
    "electrical maintenance",
    "electrical maintenance service",
    "wiring",
    "wiring work",
    "wiring service",
    "wiring repair",
    "house wiring",
    "home wiring",
    "building wiring",
    "wire repair",
    "switch repair",
    "switchboard repair",
    "socket repair",
    "plug repair",
    "fan repair",
    "ceiling fan repair",
    "light repair",
    "lighting repair",
    "light fitting",
    "power issue",
    "power problem",
    "electric problem",
    "electrical problem",
    "electrical fault",
    "electric fault",
    "short circuit",
    "short circuit repair",
    "power connection",
    "electrical connection",
  ],

  "ac-repair": [
    "ac",
    "acs",
    "air conditioner",
    "air conditioners",
    "air conditioning",
    "ac repair",
    "ac repairs",
    "ac service",
    "ac services",
    "ac servicing",
    "ac maintenance",
    "ac maintenance service",
    "air conditioner repair",
    "air conditioner service",
    "air conditioner servicing",
    "air conditioner maintenance",
    "air conditioning repair",
    "air conditioning service",
    "air conditioning maintenance",
    "ac mechanic",
    "ac mechanics",
    "ac technician",
    "ac technicians",
    "ac installation",
    "ac fitting",
    "ac not cooling",
    "ac cooling problem",
    "ac cooling issue",
    "cooling problem",
    "cooling issue",
    "ac gas refill",
    "ac gas charging",
    "ac gas filling",
    "air conditioner gas refill",
    "air conditioner gas charging",
    "split ac repair",
    "split ac service",
    "split ac installation",
    "window ac repair",
    "window ac service",
    "window ac installation",
    "central ac repair",
    "central ac service",
    "ac compressor repair",
    "ac compressor problem",
    "ac water leakage",
    "ac leakage",
  ],

  /* =======================================================
     💇 BEAUTY / PERSONAL CARE
  ======================================================= */

  salon: [
    "salon",
    "salons",
    "hair salon",
    "hair salons",
    "beauty salon",
    "beauty salons",
    "beauty parlour",
    "beauty parlours",
    "beauty parlor",
    "beauty parlors",
    "parlour",
    "parlours",
    "parlor",
    "parlors",
    "haircut",
    "hair cut",
    "hair cutting",
    "hair styling",
    "hair style",
    "hairdresser",
    "hair dressing",
    "hair care",
    "hair treatment",
    "hair spa",
    "facial",
    "facials",
    "makeup",
    "make up",
    "bridal makeup",
    "beauty service",
    "beauty services",
    "grooming",
    "grooming service",
    "spa",
    "spas",
    "men salon",
    "mens salon",
    "women salon",
    "ladies salon",
    "unisex salon",
  ],

  /* =======================================================
     🏥 HEALTHCARE
  ======================================================= */

  doctor: [
    "doctor",
    "doctors",
    "physician",
    "physicians",
    "medical doctor",
    "medical doctors",
    "medical consultation",
    "medical consultations",
    "doctor consultation",
    "health consultation",
    "healthcare",
    "health care",
    "medical service",
    "medical services",
    "clinic",
    "clinics",
    "medical clinic",
    "medical clinics",
    "treatment",
    "medical treatment",
    "doctor appointment",
    "health checkup",
    "health check-up",
    "general physician",
    "family doctor",
    "fever treatment",
    "cold treatment",
    "cough treatment",
    "body pain",
    "pain treatment",
    "health issue",
    "health problem",
  ],

  /* =======================================================
     🚗 AUTOMOTIVE
  ======================================================= */

  mechanic: [
    "mechanic",
    "mechanics",
    "auto mechanic",
    "auto mechanics",
    "car mechanic",
    "car mechanics",
    "vehicle mechanic",
    "vehicle mechanics",
    "automobile mechanic",
    "automobile repair",
    "automobile repairs",
    "auto repair",
    "auto repairs",
    "car repair",
    "car repairs",
    "vehicle repair",
    "vehicle repairs",
    "car servicing",
    "car service",
    "car services",
    "vehicle service",
    "vehicle services",
    "automobile service",
    "engine repair",
    "engine service",
    "engine problem",
    "garage",
    "garages",
    "car garage",
    "auto garage",
    "vehicle garage",
    "bike mechanic",
    "bike repair",
    "two wheeler repair",
    "two wheeler service",
  ],

  "car-wash": [
    "car wash",
    "car washes",
    "car washing",
    "vehicle wash",
    "vehicle washing",
    "auto wash",
    "auto washing",
    "car cleaning",
    "vehicle cleaning",
    "auto cleaning",
    "car detailing",
    "auto detailing",
    "vehicle detailing",
    "car polish",
    "car polishing",
    "car interior cleaning",
    "car exterior cleaning",
  ],

  /* =======================================================
     🍽️ FOOD / RESTAURANTS
  ======================================================= */

  restaurant: [
    "restaurant",
    "restaurants",
    "food restaurant",
    "food restaurants",
    "dining",
    "dining restaurant",
    "dining restaurants",
    "eatery",
    "eateries",
    "food place",
    "food places",
    "place to eat",
    "places to eat",
    "food outlet",
    "food outlets",
    "local restaurant",
    "local restaurants",
    "family restaurant",
    "family restaurants",
    "fine dining",
    "casual dining",
    "dining place",
    "dining places",
    "food joint",
    "food joints",
  ],

  cafe: [
    "cafe",
    "cafes",
    "café",
    "cafés",
    "coffee shop",
    "coffee shops",
    "coffee house",
    "coffee houses",
    "tea cafe",
    "tea cafes",
    "tea shop",
    "tea shops",
    "coffee place",
    "coffee places",
    "coffee house",
    "coffee bar",
    "tea house",
    "tea houses",
    "snack cafe",
    "snack cafes",
  ],

  /* =======================================================
     🏨 HOTEL / STAY
  ======================================================= */

  hotel: [
    "hotel",
    "hotels",
    "accommodation",
    "accommodations",
    "lodging",
    "place to stay",
    "places to stay",
    "stay",
    "stays",
    "hotel booking",
    "hotel bookings",
    "room booking",
    "room bookings",
    "guest accommodation",
    "guest accommodations",
    "guest house",
    "guest houses",
    "guesthouse",
    "guesthouses",
    "resort",
    "resorts",
    "lodge",
    "lodges",
    "hotel room",
    "hotel rooms",
    "rooms",
  ],

  /* =======================================================
     📱 ELECTRONICS
  ======================================================= */

  "mobile-repair": [
    "mobile",
    "mobiles",
    "mobile phone",
    "mobile phones",
    "phone",
    "phones",
    "smartphone",
    "smartphones",
    "mobile repair",
    "mobile repairs",
    "phone repair",
    "phone repairs",
    "smartphone repair",
    "cell phone repair",
    "mobile service",
    "mobile services",
    "phone service",
    "phone services",
    "iphone repair",
    "iphone service",
    "android repair",
    "android service",
    "screen replacement",
    "screen repair",
    "mobile screen repair",
    "mobile screen replacement",
    "display replacement",
    "phone screen replacement",
    "battery replacement",
    "mobile battery replacement",
    "charging problem",
    "charging port repair",
  ],

  "computer-repair": [
    "computer",
    "computers",
    "laptop",
    "laptops",
    "pc",
    "desktop",
    "desktops",
    "computer repair",
    "computer repairs",
    "laptop repair",
    "laptop repairs",
    "pc repair",
    "desktop repair",
    "computer service",
    "computer services",
    "laptop service",
    "laptop services",
    "notebook repair",
    "notebook service",
    "computer troubleshooting",
    "laptop troubleshooting",
    "software installation",
    "windows installation",
    "computer maintenance",
    "laptop maintenance",
  ],

  /* =======================================================
     🚚 COURIER / LOGISTICS
  ======================================================= */

  courier: [
    "courier",
    "couriers",
    "courier service",
    "courier services",
    "parcel service",
    "parcel services",
    "parcel delivery",
    "package delivery",
    "package deliveries",
    "document delivery",
    "document deliveries",
    "local courier",
    "local couriers",
    "express courier",
    "express courier service",
    "same day delivery",
    "same-day delivery",
    "delivery service",
    "delivery services",
  ],

  logistics: [
    "logistics",
    "logistics service",
    "logistics services",
    "transport service",
    "transport services",
    "transportation",
    "transport",
    "freight",
    "freight service",
    "cargo service",
    "cargo services",
    "shipping service",
    "shipping services",
    "delivery service",
    "delivery services",
    "supply chain",
    "transport company",
    "transport companies",
    "freight service",
  ],

  /* =======================================================
     🧹 CLEANING
  ======================================================= */

  cleaning: [
    "cleaning",
    "cleaner",
    "cleaners",
    "cleaning service",
    "cleaning services",
    "house cleaning",
    "home cleaning",
    "office cleaning",
    "commercial cleaning",
    "deep cleaning",
    "deep clean",
    "residential cleaning",
    "professional cleaning",
    "cleaning company",
    "cleaning companies",
    "house cleaner",
    "home cleaner",
    "office cleaner",
    "sanitization",
    "sanitization service",
    "disinfection",
    "disinfection service",
  ],

  /* =======================================================
     ⚖️ LEGAL
  ======================================================= */

  lawyer: [
    "lawyer",
    "lawyers",
    "advocate",
    "advocates",
    "attorney",
    "attorneys",
    "legal service",
    "legal services",
    "legal consultation",
    "legal consultations",
    "law firm",
    "law firms",
    "legal advisor",
    "legal advisors",
    "legal adviser",
    "legal advice",
    "solicitor",
    "solicitors",
    "legal consultant",
    "legal consultants",
    "legal consultancy",
    "legal assistance",
    "legal help",
  ],

  /* =======================================================
     💰 FINANCIAL
  ======================================================= */

  "financial-services": [
    "financial service",
    "financial services",
    "finance",
    "financial advisor",
    "financial advisors",
    "financial adviser",
    "financial consultant",
    "financial consultants",
    "investment advisor",
    "investment advisors",
    "investment consultant",
    "money management",
    "financial consultancy",
    "financial planning",
    "financial planner",
    "financial planners",
    "wealth management",
    "wealth manager",
    "tax consultant",
    "tax consultancy",
    "loan consultant",
    "loan consultancy",
  ],

  /* =======================================================
     🏠 REAL ESTATE
  ======================================================= */

  "real-estate": [
    "real estate",
    "real estate services",
    "property",
    "properties",
    "property dealer",
    "property dealers",
    "property agent",
    "property agents",
    "real estate agent",
    "real estate agents",
    "real estate broker",
    "real estate brokers",
    "property broker",
    "property brokers",
    "property consultant",
    "property consultants",
    "real estate consultant",
    "real estate consultants",
    "real estate consultancy",
    "property consultancy",
    "property management",
    "property management service",
  ],

}

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