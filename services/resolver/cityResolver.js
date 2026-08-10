// backend/services/resolver/cityResolver.js

import City from "../../models/City.js";
import memoryCache from "../../utils/memoryCache.js";

/**
 * =========================================================
 * 🧠 CITY RESOLVER — FINAL SSOT VERSION
 * =========================================================
 *
 * RESPONSIBILITY:
 *
 * - Resolve city input → City document
 * - Normalize city names / slugs
 * - Support slug lookup
 * - Support slugHistory fallback
 * - Support exact city-name fallback
 * - Cache resolved cities
 *
 * MUST NOT:
 *
 * - Query businesses
 * - Rank businesses
 * - Detect search intent
 * - Parse user queries
 * - Perform category resolution
 *
 * SSOT:
 *
 * City.slug
 *      ↓
 * City document
 *
 * =========================================================
 */

const CACHE_TTL = 60 * 60 * 6; // 6 hours

/* =========================================================
   NORMALIZE CITY INPUT
========================================================= */

/**
 * Converts:
 *
 * "New Delhi"
 * "new-delhi"
 * " NEW   DELHI "
 *
 * into:
 *
 * "new-delhi"
 *
 * Unicode letters/numbers are preserved so international
 * city names are not unnecessarily destroyed.
 */

const normalizeCityInput = (value = "") => {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/* =========================================================
   NORMALIZE CITY NAME
========================================================= */

/**
 * Converts a city name into a comparable normalized form.
 *
 * Example:
 *
 * "New Delhi"
 *      ↓
 * "new-delhi"
 *
 * "San   Francisco"
 *      ↓
 * "san-francisco"
 */

const normalizeCityName = (value = "") => {
  return normalizeCityInput(value);
};

/* =========================================================
   SAFE REGEX ESCAPE
========================================================= */

const escapeRegex = (value = "") => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

/* =========================================================
   CACHE HELPERS
========================================================= */

const getCityCacheKey = (slug) =>
  `city:slug:${slug}`;

/* =========================================================
   RESOLVE CITY BY SLUG
========================================================= */

/**
 * Resolution order:
 *
 * 1. Exact slug
 * 2. slugHistory
 * 3. Exact normalized city name
 *
 * Only active cities are returned.
 */

export const resolveCityBySlug = async (
  slug
) => {
  if (!slug) {
    return null;
  }

  const cleanSlug =
    normalizeCityInput(slug);

  if (!cleanSlug) {
    return null;
  }

  const cacheKey =
    getCityCacheKey(cleanSlug);

  /* =======================================================
     CACHE
  ======================================================= */

  const cached =
    memoryCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  /* =======================================================
     1️⃣ EXACT SLUG
  ======================================================= */

  let city =
    await City.findOne({
      slug: cleanSlug,
      status: "active",
    })
      .lean();

  /* =======================================================
     2️⃣ SLUG HISTORY
  ======================================================= */

  if (!city) {
    city =
      await City.findOne({
        "slugHistory.slug": cleanSlug,
        status: "active",
      })
        .lean();
  }

  /* =======================================================
     3️⃣ EXACT CITY NAME
  ======================================================= */

  /**
   * Migration / compatibility fallback.
   *
   * IMPORTANT:
   * This is an exact-name match, not a fuzzy search.
   */

  if (!city) {
    const cityName =
      cleanSlug.replace(/-/g, " ");

    const escapedName =
      escapeRegex(cityName);

    city =
      await City.findOne({
        name: new RegExp(
          `^${escapedName}$`,
          "iu"
        ),
        status: "active",
      })
        .lean();
  }

  /* =======================================================
     CITY NOT FOUND
  ======================================================= */

  if (!city) {
    return null;
  }

  /* =======================================================
     CACHE
  ======================================================= */

  memoryCache.set(
    cacheKey,
    city,
    CACHE_TTL
  );

  /*
   * Also cache the canonical slug if it differs
   * from the requested historical/input slug.
   */

  if (city.slug) {
    const canonicalSlug =
      normalizeCityInput(city.slug);

    if (canonicalSlug !== cleanSlug) {
      memoryCache.set(
        getCityCacheKey(canonicalSlug),
        city,
        CACHE_TTL
      );
    }
  }

  return city;
};

/* =========================================================
   MAIN CITY RESOLVER
========================================================= */

/**
 * Returns a lightweight normalized city object.
 *
 * Example:
 *
 * resolveCity("new delhi")
 *
 * →
 *
 * {
 *   _id,
 *   name,
 *   slug,
 *   district,
 *   state
 * }
 */

export const resolveCity = async (
  cityInput
) => {
  if (!cityInput) {
    return null;
  }

  try {
    const city =
      await resolveCityBySlug(
        cityInput
      );

    if (!city) {
      return null;
    }

    return {
      _id: city._id,

      name:
        city.name || null,

      /*
       * Always return the canonical current slug
       * from the City document.
       */
      slug:
        city.slug || null,

      district:
        city.district || null,

      state:
        city.state || null,
    };
  } catch (error) {
    console.error(
      "❌ resolveCity error:",
      error.message
    );

    return null;
  }
};

/* =========================================================
   OPTIONAL NORMALIZATION EXPORT
========================================================= */

export {
  normalizeCityInput,
  normalizeCityName,
};