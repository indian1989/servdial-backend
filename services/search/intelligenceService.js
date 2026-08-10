import Business from "../../models/Business.js";
import RecentSearch from "../../models/RecentSearch.js";
import SearchTrend from "../../models/SearchTrend.js";


/**
 * =========================================================
 * 🧠 SEARCH INTELLIGENCE SERVICE
 * =========================================================
 *
 * RESPONSIBILITY:
 * ---------------------------------------------------------
 * - Autocomplete suggestions
 * - Trending searches
 * - User recent searches
 * - Lightweight search intelligence
 *
 * MUST NOT:
 * ---------------------------------------------------------
 * - Parse natural-language search intent
 * - Resolve cities
 * - Resolve categories
 * - Rank full search results
 * - Contain route/controller logic
 *
 * WORLDWIDE READY:
 * ---------------------------------------------------------
 * - City is optional
 * - No India-specific assumptions
 * - User searches are correctly user-scoped
 * - Safe regex handling
 * - Compatible with future personalization
 *
 * =========================================================
 */


/* =========================================================
   🔐 SAFE REGEX
========================================================= */

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");


/* =========================================================
   🧼 NORMALIZE
========================================================= */

const normalizeQuery = (value = "") =>
  String(value)
    .trim()
    .toLowerCase();


/* =========================================================
   🔍 AUTOCOMPLETE SERVICE
========================================================= */

export const getAutocompleteService = async ({
  q = "",
  city = null,
  userId = null,
} = {}) => {

  const query = normalizeQuery(q);

  if (!query) {
    return [];
  }


  /* =======================================================
     SAFE REGEX
  ======================================================= */

  const safeQuery = escapeRegex(query);

  const regex = new RegExp(
    safeQuery,
    "i"
  );


  /* =======================================================
     BUSINESS QUERY
  ======================================================= */

  const businessQuery = {

    status: "approved",

    isDeleted: false,

    $or: [
      {
        name: regex,
      },

      {
        tags: regex,
      },

      {
        categorySlug: regex,
      },
    ],

  };


  /* =======================================================
     OPTIONAL CITY FILTER
     
     IMPORTANT:
     -------------------------------------------------------
     City resolution is NOT performed here.
     
     If city is supplied, it is treated only as an
     already-normalized city slug/value.
     
     Full city resolution belongs to the search
     intelligence/resolver layer.
  ======================================================= */

  if (city) {

    const cityValue =
      normalizeQuery(city);

    if (cityValue) {

      businessQuery.citySlug =
        cityValue;

    }

  }


  /* =======================================================
     FETCH BUSINESS SUGGESTIONS
  ======================================================= */

  const businesses =
    await Business.find(
      businessQuery
    )
      .select(
        "name slug categorySlug cityName citySlug"
      )
      .limit(8)
      .lean();


  /* =======================================================
     FORMAT BUSINESS SUGGESTIONS
  ======================================================= */

  const businessSuggestions =
    businesses.map((business) => ({

      type: "business",

      name:
        business.name,

      slug:
        business.slug,

      categorySlug:
        business.categorySlug || null,

      citySlug:
        business.citySlug || null,

      cityName:
        business.cityName || null,

    }));


  /* =======================================================
     QUERY/TREND SUGGESTIONS
     
     Only retrieve matching trends.
  ======================================================= */

  const trendQuery = {

    query: regex,

  };


  /*
   * City-aware trends are optional.
   *
   * We intentionally do not force a city filter because
   * worldwide search should still work when a city is not
   * available.
   */

  if (city) {

    const cityValue =
      normalizeQuery(city);

    if (cityValue) {

      trendQuery.citySlug =
        cityValue;

    }

  }


  const trends =
    await SearchTrend.find(
      trendQuery
    )
      .sort({
        count: -1,
        lastSearchedAt: -1,
      })
      .limit(5)
      .select(
        "query citySlug"
      )
      .lean();


  /* =======================================================
     TREND SUGGESTIONS
  ======================================================= */

  const trendSuggestions =
    trends.map((trend) => ({

      type: "query",

      name:
        trend.query,

      citySlug:
        trend.citySlug || null,

    }));


  /* =======================================================
     RECENT USER SEARCHES
     
     IMPORTANT:
     RecentSearch schema uses:
     
       user: ObjectId
     
     NOT:
     
       userId
  ======================================================= */

  let recentSuggestions = [];


  if (userId) {

    const recentQuery = {

      user: userId,

    };


    if (city) {

      const cityValue =
        normalizeQuery(city);

      if (cityValue) {

        recentQuery.citySlug =
          cityValue;

      }

    }


    const recent =
      await RecentSearch.find(
        recentQuery
      )
        .sort({
          lastSearchedAt: -1,
          createdAt: -1,
        })
        .limit(5)
        .select(
          "query citySlug cityName"
        )
        .lean();


    recentSuggestions =
      recent.map((item) => ({

        type: "recent",

        name:
          item.query,

        citySlug:
          item.citySlug || null,

        cityName:
          item.cityName || null,

      }));

  }


  /* =======================================================
     COMBINE + DEDUPLICATE
  ======================================================= */

  const combined = [

    ...recentSuggestions,

    ...trendSuggestions,

    ...businessSuggestions,

  ];


  const seen =
    new Set();


  const suggestions = [];


  for (const item of combined) {

    const key =
      `${item.type}:${String(item.name || "")
        .trim()
        .toLowerCase()}`;

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);

    suggestions.push(item);

  }


  /* =======================================================
     FINAL LIMIT
  ======================================================= */

  return suggestions.slice(
    0,
    10
  );

};


/* =========================================================
   📈 TRENDING SEARCHES
========================================================= */

export const getTrendingSearchesService =
  async ({
    city = null,
  } = {}) => {

    const query = {};


    /* =======================================================
       OPTIONAL CITY
    ======================================================= */

    if (city) {

      const cityValue =
        normalizeQuery(city);

      if (cityValue) {

        query.citySlug =
          cityValue;

      }

    }


    /* =======================================================
       FETCH TRENDS
    ======================================================= */

    const trends =
      await SearchTrend.find(
        query
      )
        .sort({
          count: -1,
          lastSearchedAt: -1,
        })
        .limit(10)
        .select(
          "query citySlug"
        )
        .lean();


    /* =======================================================
       RETURN
    ======================================================= */

    return trends.map((trend) => ({

      type: "query",

      name:
        trend.query,

      citySlug:
        trend.citySlug || null,

    }));

  };


/* =========================================================
   🕘 RECENT SEARCHES
========================================================= */

export const getRecentSearchesService =
  async (
    userId
  ) => {

    if (!userId) {
      return [];
    }


    /* =======================================================
       FETCH USER RECENT SEARCHES
       
       Schema field:
         user
    ======================================================= */

    const recent =
      await RecentSearch.find({

        user: userId,

      })
        .sort({
          lastSearchedAt: -1,
          createdAt: -1,
        })
        .limit(10)
        .select(
          "query citySlug cityName category lastSearchedAt"
        )
        .lean();


    /* =======================================================
       FORMAT
    ======================================================= */

    return recent.map((item) => ({

      type: "recent",

      name:
        item.query,

      citySlug:
        item.citySlug || null,

      cityName:
        item.cityName || null,

      category:
        item.category || null,

      lastSearchedAt:
        item.lastSearchedAt || null,

    }));

  };