import { resolveCity } from "../resolver/cityResolver.js";
import { resolveCategoryContext } from "../resolver/categoryResolver.js";

import { detectIntent } from "../../utils/intentDetector.js";
import { parseSearchIntent } from "../../utils/parseSearchIntent.js";

/**
 * =========================================================
 * 🧠 BUILD SEARCH CONTEXT (SSOT)
 * =========================================================
 * Uses your existing utils folder ONLY
 * =========================================================
 */

export const buildSearchContext = async (query = "", filters = {}) => {
  const cleanQuery = (query || "").trim();

  // ================= EMPTY SAFETY =================
  if (!cleanQuery && Object.keys(filters).length === 0) {
    return {
      rawQuery: "",
      cityId: null,
      categoryId: null,
      categoryIds: [],
      intent: "UNKNOWN",
      textSearch: "",
      filters: {},
      debug: { empty: true },
    };
  }

  // ================= INTENT =================
  const intent = detectIntent(cleanQuery);
  const parsed = parseSearchIntent(cleanQuery);

  const { citySlug, categorySlug, textSearch } = parsed;

  // ================= CITY RESOLVE =================
  let city = null;
  if (citySlug) {
    city = await resolveCity(citySlug);
  }

  // ================= CATEGORY RESOLVE =================
  let categoryContext = null;
  if (categorySlug) {
    categoryContext = await resolveCategoryContext(categorySlug);
  }

  // ================= NORMALIZED OUTPUT =================
  const categoryId = categoryContext?.primaryCategoryId || null;
  const categoryIds = categoryContext?.leafCategoryIds || [];

  return {
    rawQuery: cleanQuery,

    cityId: city?._id || null,
    categoryId,
    categoryIds,

    intent,
    textSearch: textSearch || cleanQuery,

    filters: { ...filters },

    debug: {
      hasCity: !!city,
      hasCategory: !!categoryContext,
      parsed,
    },
  };
};