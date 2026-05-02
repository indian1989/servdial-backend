import { resolveCity } from "../resolvers/cityResolver.js";
import { resolveCategoryContext } from "../resolvers/categoryResolver.js";
import { detectIntent } from "../../utils/intentDetector.js";
import { parseSearchIntent } from "../../utils/parseSearchIntent.js";

/**
 * UNIFIED SEARCH ENGINE
 * Converts raw query → structured search object
 */

export const buildSearchContext = async (query = "", filters = {}) => {
  if (!query && Object.keys(filters).length === 0) {
    return {
      query: "",
      cityId: null,
      categoryIds: [],
      intent: "UNKNOWN",
      textSearch: "",
      filters: {},
    };
  }

  // ================= INTENT ANALYSIS =================
  const intent = detectIntent(query);

  const parsed = parseSearchIntent(query);

  const {
    citySlug,
    categorySlug,
    textSearch
  } = parsed;

  // ================= RESOLVE CITY =================
  let city = null;

  if (citySlug) {
    city = await resolveCity(citySlug);
  }

  // ================= RESOLVE CATEGORY =================
  let categoryContext = null;

  if (categorySlug) {
    categoryContext = await resolveCategoryContext(categorySlug);
  }

  // ================= BUILD FINAL CONTEXT =================
  const searchContext = {
    rawQuery: query,

    // resolved IDs
    cityId: city ? city._id : null,
    categoryIds: categoryContext ? categoryContext.categoryIds : [],

    // metadata
    intent,
    textSearch,

    // filters (future expansion)
    filters: {
      ...filters,
    },

    // debug context (VERY IMPORTANT for tuning ranking later)
    debug: {
      hasCity: !!city,
      hasCategory: !!categoryContext,
      parsed,
    },
  };

  return searchContext;
};