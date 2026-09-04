// backend/services/analytics/searchTrackingService.js
import VisitorEvent from "../../models/VisitorEvent.js";

import {
  trackSearchEvent,
  trackEvent,
} from "./eventTrackingService.js";

/**
 * =========================================================
 * 🔎 SEARCH TRACKING SERVICE
 * =========================================================
 *
 * RESPONSIBILITY:
 *
 * - Track search queries
 * - Track city/category context
 * - Track result count
 * - Detect no-result searches
 * - Track search-result clicks
 * - Track autocomplete shown
 * - Track autocomplete selection
 *
 * IMPORTANT:
 *
 * - This service DOES NOT modify search ranking.
 * - This service DOES NOT modify unifiedSearchEngine.
 * - This service only records analytics.
 * - Search events are stored in VisitorEvent.
 *
 * =========================================================
 */

/**
 * ---------------------------------------------------------
 * SAFE STRING
 * ---------------------------------------------------------
 */
const safeString = (value = "") => {
  return String(value || "").trim();
};

/**
 * ---------------------------------------------------------
 * SAFE NUMBER
 * ---------------------------------------------------------
 */
const safeNumber = (
  value,
  fallback = 0
) => {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};

/**
 * ---------------------------------------------------------
 * SAFE OBJECT
 * ---------------------------------------------------------
 */
const safeObject = (
  value
) => {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value;
  }

  return {};
};

/**
 * =========================================================
 * TRACK SEARCH
 * =========================================================
 *
 * Captures:
 *
 * - query
 * - city
 * - category
 * - result count
 * - no-result state
 * - filters
 * - sort
 *
 * =========================================================
 */
export const trackSearch = async ({
  visitorId,
  sessionId = null,
  user = null,

  query = "",

  path = "/search",
  pageViewId = null,

  city = null,
  category = null,

  citySlug = "",
  categorySlug = "",

  resultCount = 0,

  filters = {},
  sort = "",

  source = "unknown",

  metadata = {},

  deviceType = "",
  browser = "",
  operatingSystem = "",

  country = "",
  state = "",
  cityName = "",
} = {}) => {
  const normalizedQuery =
    safeString(query);

  /**
   * -------------------------------------------------------
   * Empty search should not create a search analytics event.
   * -------------------------------------------------------
   */
  if (!normalizedQuery) {
    return {
      success: false,
      event: null,
      message:
        "Search query is required.",
    };
  }

  const normalizedResultCount =
    Math.max(
      0,
      Math.floor(
        safeNumber(
          resultCount,
          0
        )
      )
    );

  const searchMetadata = {
    ...safeObject(metadata),

    citySlug:
      safeString(citySlug),

    categorySlug:
      safeString(categorySlug),

    resultCount:
      normalizedResultCount,

    hasResults:
      normalizedResultCount > 0,

    noResults:
      normalizedResultCount === 0,

    filters:
      safeObject(filters),

    sort:
      safeString(sort),
  };

  return trackSearchEvent({
    visitorId,
    sessionId,
    user,

    query:
      normalizedQuery,

    path,
    pageViewId,

    category,
    city,

    resultCount:
      normalizedResultCount,

    metadata:
      searchMetadata,

    source,

    deviceType,
    browser,
    operatingSystem,

    country,
    state,
    cityName,
  });
};

/**
 =========================================================
 * TRACK NO-RESULT SEARCH
 * =========================================================
 *
 * Convenience helper for admin analytics.
 *
 * =========================================================
 */
export const trackNoResultSearch =
  async ({
    visitorId,
    sessionId = null,
    user = null,

    query = "",

    path = "/search",
    pageViewId = null,

    city = null,
    category = null,

    citySlug = "",
    categorySlug = "",

    filters = {},
    sort = "",

    source = "unknown",

    metadata = {},

    deviceType = "",
    browser = "",
    operatingSystem = "",

    country = "",
    state = "",
    cityName = "",
  } = {}) => {
    return trackSearch({
      visitorId,
      sessionId,
      user,

      query,

      path,
      pageViewId,

      city,
      category,

      citySlug,
      categorySlug,

      resultCount: 0,

      filters,
      sort,

      source,

      metadata: {
        ...safeObject(metadata),

        noResults: true,
      },

      deviceType,
      browser,
      operatingSystem,

      country,
      state,
      cityName,
    });
  };

/**
 * =========================================================
 * TRACK SEARCH RESULT CLICK
 * =========================================================
 *
 * Records which result was selected after a search.
 *
 * This is separate from the existing BusinessClick model.
 *
 * BusinessClick:
 *   existing ranking/business analytics
 *
 * VisitorEvent:
 *   platform-wide behavioral analytics
 *
 * =========================================================
 */
export const trackSearchResultClick =
  async ({
    visitorId,
    sessionId = null,
    user = null,

    query = "",

    business = null,

    resultPosition = null,

    path = "",
    pageViewId = null,

    city = null,
    category = null,

    source = "unknown",

    metadata = {},

    deviceType = "",
    browser = "",
    operatingSystem = "",

    country = "",
    state = "",
    cityName = "",
  } = {}) => {
    const normalizedQuery =
      safeString(query);

    const normalizedPosition =
      resultPosition === null ||
      resultPosition === undefined
        ? null
        : Math.max(
            0,
            Math.floor(
              safeNumber(
                resultPosition,
                0
              )
            )
          );

    return trackEvent({
      visitorId,
      sessionId,
      user,

      event:
        "listing_click",

      eventLabel:
        normalizedQuery,

      path,
      pageViewId,

      business,

      category,
      city,

      query:
        normalizedQuery,

      metadata: {
        ...safeObject(metadata),

        resultPosition:
          normalizedPosition,

        searchQuery:
          normalizedQuery,
      },

      source,

      deviceType,
      browser,
      operatingSystem,

      country,
      state,
      cityName,
    });
  };

/**
 * =========================================================
 * TRACK BUSINESS SEARCH CLICK
 * =========================================================
 *
 * Convenience alias for business result clicks.
 * =========================================================
 */
export const trackBusinessSearchClick =
  async ({
    visitorId,
    sessionId = null,
    user = null,

    query = "",

    business = null,

    resultPosition = null,

    path = "",
    pageViewId = null,

    city = null,
    category = null,

    source = "unknown",

    metadata = {},

    deviceType = "",
    browser = "",
    operatingSystem = "",

    country = "",
    state = "",
    cityName = "",
  } = {}) => {
    return trackSearchResultClick({
      visitorId,
      sessionId,
      user,

      query,

      business,

      resultPosition,

      path,
      pageViewId,

      city,
      category,

      source,

      metadata,

      deviceType,
      browser,
      operatingSystem,

      country,
      state,
      cityName,
    });
  };

/**
 * =========================================================
 * TRACK AUTOCOMPLETE SHOWN
 * =========================================================
 *
 * Records that autocomplete suggestions were displayed.
 *
 * =========================================================
 */
export const trackAutocompleteShown =
  async ({
    visitorId,
    sessionId = null,
    user = null,

    query = "",

    suggestionCount = 0,

    path = "/search",

    city = null,
    category = null,

    source = "unknown",

    metadata = {},

    deviceType = "",
    browser = "",
    operatingSystem = "",

    country = "",
    state = "",
    cityName = "",
  } = {}) => {
    const normalizedQuery =
      safeString(query);

    const count =
      Math.max(
        0,
        Math.floor(
          safeNumber(
            suggestionCount,
            0
          )
        )
      );

    return trackEvent({
      visitorId,
      sessionId,
      user,

      event:
        "other",

      eventLabel:
        "autocomplete_shown",

      path,

      category,
      city,

      query:
        normalizedQuery,

      metadata: {
        ...safeObject(metadata),

        autocompleteAction:
          "shown",

        suggestionCount:
          count,
      },

      source,

      deviceType,
      browser,
      operatingSystem,

      country,
      state,
      cityName,
    });
  };

/**
 * =========================================================
 * TRACK AUTOCOMPLETE SELECTION
 * =========================================================
 *
 * Records when a user selects an autocomplete suggestion.
 *
 * =========================================================
 */
export const trackAutocompleteSelection =
  async ({
    visitorId,
    sessionId = null,
    user = null,

    query = "",

    selectedValue = "",
    selectedType = "query",

    business = null,
    category = null,
    city = null,

    path = "/search",
    pageViewId = null,

    resultPosition = null,

    source = "unknown",

    metadata = {},

    deviceType = "",
    browser = "",
    operatingSystem = "",

    country = "",
    state = "",
    cityName = "",
  } = {}) => {
    const normalizedQuery =
      safeString(query);

    const normalizedValue =
      safeString(selectedValue);

    const normalizedType =
      safeString(
        selectedType
      ) || "query";

    const normalizedPosition =
      resultPosition === null ||
      resultPosition === undefined
        ? null
        : Math.max(
            0,
            Math.floor(
              safeNumber(
                resultPosition,
                0
              )
            )
          );

    return trackEvent({
      visitorId,
      sessionId,
      user,

      event:
        "other",

      eventLabel:
        "autocomplete_selected",

      path,
      pageViewId,

      business,
      category,
      city,

      query:
        normalizedQuery,

      metadata: {
        ...safeObject(metadata),

        autocompleteAction:
          "selected",

        selectedValue:
          normalizedValue,

        selectedType:
          normalizedType,

        resultPosition:
          normalizedPosition,
      },

      source,

      deviceType,
      browser,
      operatingSystem,

      country,
      state,
      cityName,
    });
  };

/**
 * =========================================================
 * TRACK SEARCH FILTER
 * =========================================================
 *
 * Records filter usage without changing the actual search.
 *
 * =========================================================
 */
export const trackSearchFilter =
  async ({
    visitorId,
    sessionId = null,
    user = null,

    query = "",

    filterName = "",
    filterValue = "",

    filters = {},

    path = "/search",
    pageViewId = null,

    city = null,
    category = null,

    source = "unknown",

    metadata = {},

    deviceType = "",
    browser = "",
    operatingSystem = "",

    country = "",
    state = "",
    cityName = "",
  } = {}) => {
    return trackEvent({
      visitorId,
      sessionId,
      user,

      event:
        "filter",

      eventLabel:
        safeString(filterName),

      path,
      pageViewId,

      category,
      city,

      query:
        safeString(query),

      metadata: {
        ...safeObject(metadata),

        filterName:
          safeString(filterName),

        filterValue:
          safeString(filterValue),

        filters:
          safeObject(filters),
      },

      source,

      deviceType,
      browser,
      operatingSystem,

      country,
      state,
      cityName,
    });
  };

/**
 * =========================================================
 * GET SEARCH EVENTS
 * =========================================================
 *
 * Useful later for admin analytics / reporting.
 *
 * =========================================================
 */
export const getSearchEvents =
  async ({
    visitorId = null,
    sessionId = null,
    limit = 50,
  } = {}) => {
    const query = {
      event: "search",
    };

    if (safeString(visitorId)) {
      query.visitorId =
        safeString(visitorId);
    }

    if (safeString(sessionId)) {
      query.sessionId =
        safeString(sessionId);
    }

    const safeLimit =
      Math.min(
        100,
        Math.max(
          1,
          Math.floor(
            safeNumber(
              limit,
              50
            )
          )
        )
      );

    return VisitorEvent.find(
      query
    )
      .sort({
        occurredAt: -1,
      })
      .limit(safeLimit);
  };