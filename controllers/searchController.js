import asyncHandler from "express-async-handler";

import {
  getAutocompleteService,
  getTrendingSearchesService,
  getRecentSearchesService,
} from "../services/search/intelligenceService.js";


/**
 * =========================================================
 * 🔎 SEARCH CONTROLLER
 * =========================================================
 *
 * RESPONSIBILITY:
 * ---------------------------------------------------------
 * - Receive HTTP request
 * - Validate/normalize lightweight request input
 * - Call appropriate search service
 * - Return consistent API response
 *
 * MUST NOT:
 * ---------------------------------------------------------
 * - Query Business directly
 * - Resolve City directly
 * - Resolve Category directly
 * - Rank businesses
 * - Parse search intent
 * - Perform semantic mapping
 * - Contain search business logic
 *
 * SEARCH ARCHITECTURE:
 *
 * Route
 *   ↓
 * Controller
 *   ↓
 * Service
 *   ↓
 * Resolver / Intelligence
 *   ↓
 * Database
 *
 * =========================================================
 */


/* =========================================================
   🔍 AUTOCOMPLETE
========================================================= */

export const getAutocompleteSuggestions =
  asyncHandler(async (req, res) => {

    const q =
      String(req.query.q || "").trim();

    const city =
      req.query.city
        ? String(req.query.city).trim()
        : null;

    /*
     * Empty query:
     * Do not hit database.
     */

    if (!q) {

      return res.json({
        success: true,

        data: [],

        meta: {
          total: 0,
          type: "autocomplete",
          query: "",
          city: city || null,
        },
      });
    }


    /*
     * Keep autocomplete lightweight.
     *
     * Service decides:
     * - business suggestions
     * - query suggestions
     * - ranking
     * - caching
     *
     * Controller does not make those decisions.
     */

    const data =
      await getAutocompleteService({
        q,
        city,
        userId:
          req.user?._id || null,
      });


    return res.json({

      success: true,

      data,

      meta: {
        total:
          Array.isArray(data)
            ? data.length
            : 0,

        type: "autocomplete",

        query: q,

        city:
          city || null,
      },

    });

  });


/* =========================================================
   📈 TRENDING SEARCHES
========================================================= */

export const getTrendingSearches =
  asyncHandler(async (req, res) => {

    const city =
      req.query.city
        ? String(req.query.city).trim()
        : null;


    const data =
      await getTrendingSearchesService({
        city,
        userId:
          req.user?._id || null,
      });


    return res.json({

      success: true,

      data,

      meta: {
        total:
          Array.isArray(data)
            ? data.length
            : 0,

        type: "trending",

        city:
          city || null,
      },

    });

  });


/* =========================================================
   🕘 RECENT SEARCHES
========================================================= */

export const getRecentSearches =
  asyncHandler(async (req, res) => {

    const userId =
      req.user?._id || null;

    /*
     * Recent searches are user-scoped.
     *
     * Anonymous users:
     * return empty array.
     */

    if (!userId) {

      return res.json({

        success: true,

        data: [],

        meta: {
          total: 0,
          type: "recent",
          userScoped: true,
        },

      });

    }


    const data =
      await getRecentSearchesService(
        userId
      );


    return res.json({

      success: true,

      data,

      meta: {
        total:
          Array.isArray(data)
            ? data.length
            : 0,

        type: "recent",

        userScoped: true,
      },

    });

  });


/* =========================================================
   🚫 LEGACY SEARCH ENDPOINT
========================================================= */

export const searchBusinesses =
  asyncHandler(async (req, res) => {

    return res.status(410).json({

      success: false,

      message:
        "Deprecated endpoint. Use /api/businesses/search instead.",

      data: [],

      meta: {
        deprecated: true,

        replacement:
          "/api/businesses/search",
      },

    });

  });