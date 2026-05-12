import { resolveCity } from "../resolver/cityResolver.js";
import { resolveCategoryContext } from "../resolver/categoryResolver.js";

import { detectIntent } from "../../utils/intentDetector.js";
import { parseSearchIntent } from "../../utils/parseSearchIntent.js";
import { getSemanticCategory } from "../../utils/semanticMapper.js";

/**
 * =========================================================
 * 🧠 BUILD SEARCH CONTEXT (FINAL SSOT VERSION)
 * =========================================================
 * RESPONSIBILITY:
 * - understand query
 * - resolve city/category
 * - normalize search context
 *
 * MUST NOT:
 * - query businesses
 * - rank businesses
 * - contain semantic dictionary
 * =========================================================
 */

export const buildSearchContext = async (
  query = "",
  filters = {}
) => {
  const cleanQuery = (query || "").trim();

  // =====================================================
  // EMPTY SAFETY
  // =====================================================
  if (!cleanQuery && Object.keys(filters).length === 0) {
    return {
      rawQuery: "",
      cityId: null,
      categoryId: null,
      categoryIds: [],
      intent: "UNKNOWN",
      textSearch: "",
      filters: {},
      debug: {
        empty: true,
      },
    };
  }

  // =====================================================
  // INTENT DETECTION
  // =====================================================
  const intent = detectIntent(cleanQuery);

  // =====================================================
  // QUERY PARSING
  // =====================================================
  const parsed = parseSearchIntent(cleanQuery);

  let {
    citySlug,
    categorySlug,
    textSearch,
  } = parsed;

  // =====================================================
  // FALLBACK CITY FROM FILTERS
  // =====================================================
  if (!citySlug && filters.citySlug) {
    citySlug = filters.citySlug;
  }

  // =====================================================
  // FALLBACK CATEGORY FROM FILTERS
  // =====================================================
  if (!categorySlug && filters.categorySlug) {
    categorySlug = filters.categorySlug;
  }

  // =====================================================
  // SEMANTIC CATEGORY DETECTION
  // =====================================================
  // Example:
  // "light repair near me"
  // → electrician
  // "pipe leakage"
  // → plumber

  if (!categorySlug) {
    const semanticCategory =
      getSemanticCategory(cleanQuery);

    if (semanticCategory) {
      categorySlug = semanticCategory;
    }
  }

  // =====================================================
  // REMOVE NOISE WORDS
  // =====================================================
  let normalizedSearch = cleanQuery
    .replace(/\bnear me\b/gi, "")
    .replace(/\bin\b/gi, "")
    .trim();

  // =====================================================
  // REMOVE CITY NAME FROM TEXT SEARCH
  // =====================================================
  if (filters.citySlug) {
    const cityText = filters.citySlug
      .replace(/-/g, " ");

    normalizedSearch = normalizedSearch
      .replace(new RegExp(cityText, "gi"), "")
      .trim();
  }

  // =====================================================
  // RESOLVE CITY
  // =====================================================
  let city = null;

  if (citySlug) {
    city = await resolveCity(citySlug);
  }

  // =====================================================
  // RESOLVE CATEGORY
  // =====================================================
  let categoryContext = null;

  if (categorySlug) {
    categoryContext =
      await resolveCategoryContext(categorySlug);
  }

  // =====================================================
  // NORMALIZED CATEGORY OUTPUT
  // =====================================================
  const categoryId =
    categoryContext?.primaryCategoryId || null;

  const categoryIds =
    categoryContext?.leafCategoryIds || [];

  // =====================================================
  // FINAL CONTEXT
  // =====================================================
  return {
    rawQuery: cleanQuery,

    cityId: city?._id || null,

    categoryId,
    categoryIds,

    intent,

    textSearch:
      textSearch ||
      normalizedSearch ||
      cleanQuery,

    filters: {
      ...filters,
    },

    debug: {
      hasCity: !!city,
      hasCategory: !!categoryContext,

      semanticCategory:
        categorySlug || null,

      parsed,
    },
  };
};