import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";

import SystemSettings from "../models/SystemSettings.js";
import ActivityLogs from "../models/ActivityLogs.js";
import Business from "../models/Business.js";
import Category from "../models/Category.js";
import City from "../models/City.js";
import User from "../models/User.js";
import Lead from "../models/Lead.js";
import Banner from "../models/Banner.js";
import Visitor from "../models/Visitor.js";
import VisitorSession from "../models/VisitorSession.js";
import PageView from "../models/PageView.js";
import VisitorEvent from "../models/VisitorEvent.js";

/* ======================================================
   GET ADMIN BUSINESSES (OPTIONAL LIST VIEW ONLY)
   - READ ONLY (NO STATUS LOGIC HERE)
====================================================== */
export const getAdminBusinesses = asyncHandler(async (req, res) => {
  console.log("ADMIN QUERY PARAMS:", req.query);

  const {
    city,
    category,
    search,
    page = 1,
    limit = 20,
  } = req.query;

  const query = {};

  if (city) query.cityId = city;
  if (category) query.categoryId = category;

  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  const businesses = await Business.find(query, null, {
    includeAll: true,
  })
    .populate("owner", "name email role")
    .populate("categoryId", "name")
    .sort({ createdAt: -1 })
    .skip((page - 1) * Number(limit))
    .limit(Number(limit));

  const total = await Business.countDocuments(query);

  res.json({
    success: true,
    data: businesses,
    meta: {
      total,
      page: Number(page),
    },
  });
});

/* ======================================================
   DASHBOARD STATS
====================================================== */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const users = await User.countDocuments({
    role: { $in: ["user", "provider"] },
  });

  const admins = await User.countDocuments({
    role: { $in: ["admin", "superadmin"] },
  });

  const cities = await City.countDocuments();
  const categories = await Category.countDocuments();
  const businesses = await Business.countDocuments();

  res.json({
    success: true,
    stats: {
      users,
      admins,
      cities,
      categories,
      businesses,
    },
  });
});

/* ======================================================
   ANALYTICS
   SINGLE SOURCE FOR ADMIN ANALYTICS
====================================================== */
export const getAnalytics = asyncHandler(async (req, res) => {
  const now = new Date();

  /* =====================================================
     1. BASIC COUNTS
  ===================================================== */

  const [
    totalUsers,
    totalProviders,
    totalAdmins,
    totalCities,
    totalCategories,
    totalBusinesses,
    totalLeads,

    pendingBusinesses,
    featuredBusinesses,

    totalBanners,
    approvedBanners,
    pendingBanners,
    rejectedBanners,

    paidBanners,
    unpaidBanners,

    activeBanners,
    inactiveBanners,

    expiredBanners,
    scheduledBanners,

    providerBanners,
    adminBanners,
    superadminBanners,

    bannerClicksResult,

    businessByCategory,
    businessByCity,
    businessByStatus,
    bannersByPlacement,
  ] = await Promise.all([

    /* ================= USERS ================= */

    User.countDocuments({
      role: "user",
    }),

    User.countDocuments({
      role: "provider",
    }),

    User.countDocuments({
      role: {
        $in: ["admin", "superadmin"],
      },
    }),

    /* ================= LOCATION ================= */

    City.countDocuments(),

    Category.countDocuments(),

    /* ================= BUSINESSES ================= */

    Business.countDocuments(),

    /* ================= LEADS ================= */

    Lead.countDocuments(),

    /* ================= BUSINESS STATUS ================= */

    Business.countDocuments({
      status: "pending",
    }),

    Business.countDocuments({
      isFeatured: true,
    }),

    /* =================================================
       BANNERS
    ================================================= */

    Banner.countDocuments(),

    Banner.countDocuments({
      status: "approved",
    }),

    Banner.countDocuments({
      status: "pending",
    }),

    Banner.countDocuments({
      status: "rejected",
    }),

    /* ================= PAYMENT ================= */

    Banner.countDocuments({
      paymentStatus: "paid",
    }),

    Banner.countDocuments({
      paymentStatus: {
        $ne: "paid",
      },
    }),

    /* ================= ACTIVE ================= */

    Banner.countDocuments({
      status: "approved",
      isActive: true,

      $or: [
        {
          paymentStatus: "paid",
        },
        {
          role: {
            $in: ["admin", "superadmin"],
          },
        },
      ],

      $and: [
        {
          $or: [
            {
              startDate: {
                $lte: now,
              },
            },
            {
              startDate: null,
            },
            {
              startDate: {
                $exists: false,
              },
            },
          ],
        },
        {
          $or: [
            {
              endDate: {
                $gte: now,
              },
            },
            {
              endDate: null,
            },
            {
              endDate: {
                $exists: false,
              },
            },
          ],
        },
      ],
    }),

    Banner.countDocuments({
      isActive: false,
    }),

    /* ================= EXPIRED ================= */

    Banner.countDocuments({
      endDate: {
        $lt: now,
      },
    }),

    /* ================= SCHEDULED ================= */

    Banner.countDocuments({
      startDate: {
        $gt: now,
      },
    }),

    /* ================= BANNER ROLES ================= */

    Banner.countDocuments({
      role: "provider",
    }),

    Banner.countDocuments({
      role: "admin",
    }),

    Banner.countDocuments({
      role: "superadmin",
    }),

    /* ================= CLICKS ================= */

    Banner.aggregate([
      {
        $group: {
          _id: null,
          totalClicks: {
            $sum: {
              $ifNull: ["$clicks", 0],
            },
          },
        },
      },
    ]),

    /* =================================================
       BUSINESS BY CATEGORY
    ================================================= */

    Business.aggregate([
      {
        $group: {
          _id: "$categoryId",
          count: {
            $sum: 1,
          },
        },
      },

      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },

      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 0,

          category: {
            $ifNull: [
              "$category.name",
              "Uncategorized",
            ],
          },

          count: 1,
        },
      },

      {
        $sort: {
          count: -1,
        },
      },
    ]),

    /* =================================================
       BUSINESS BY CITY
    ================================================= */

    Business.aggregate([
      {
        $group: {
          _id: "$cityId",
          count: {
            $sum: 1,
          },
        },
      },

      {
        $lookup: {
          from: "cities",
          localField: "_id",
          foreignField: "_id",
          as: "city",
        },
      },

      {
        $unwind: {
          path: "$city",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 0,

          city: {
            $ifNull: [
              "$city.name",
              "Unknown City",
            ],
          },

          count: 1,
        },
      },

      {
        $sort: {
          count: -1,
        },
      },
    ]),

    /* =================================================
       BUSINESS BY STATUS
    ================================================= */

    Business.aggregate([
      {
        $group: {
          _id: {
            $ifNull: [
              "$status",
              "unknown",
            ],
          },

          count: {
            $sum: 1,
          },
        },
      },

      {
        $project: {
          _id: 0,

          status: "$_id",

          count: 1,
        },
      },

      {
        $sort: {
          count: -1,
        },
      },
    ]),

    /* =================================================
       BANNER BY PLACEMENT
    ================================================= */

    Banner.aggregate([
      {
        $group: {
          _id: "$placement",

          count: {
            $sum: 1,
          },

          clicks: {
            $sum: {
              $ifNull: [
                "$clicks",
                0,
              ],
            },
          },
        },
      },

      {
        $project: {
          _id: 0,

          placement: "$_id",

          count: 1,

          clicks: 1,
        },
      },

      {
        $sort: {
          count: -1,
        },
      },
    ]),
  ]);


  /* =====================================================
     CLICKS
  ===================================================== */

  const totalBannerClicks =
    bannerClicksResult?.[0]?.totalClicks || 0;


  /* =====================================================
     USERS TOTAL
  ===================================================== */

  const totalUsersIncludingAdmins =
    totalUsers +
    totalProviders +
    totalAdmins;


  /* =====================================================
     BUSINESS ACTIVE
  ===================================================== */

  const activeBusinesses = Math.max(
    totalBusinesses -
      pendingBusinesses,
    0
  );


  /* =====================================================
     RESPONSE
  ===================================================== */

  res.json({
    success: true,

    data: {

      /* ================= USERS ================= */

      users: {
        total: totalUsersIncludingAdmins,

        regular: totalUsers,

        providers: totalProviders,

        admins: totalAdmins,
      },


      /* ================= BUSINESSES ================= */

      businesses: {
        total: totalBusinesses,

        active: activeBusinesses,

        pending: pendingBusinesses,

        featured: featuredBusinesses,

        status: businessByStatus,
      },


      /* ================= LOCATION ================= */

      cities: {
        total: totalCities,
      },


      categories: {
        total: totalCategories,
      },


      /* ================= LEADS ================= */

      leads: {
        total: totalLeads,
      },


      /* ================= BANNERS ================= */

      banners: {

        total: totalBanners,

        approved: approvedBanners,

        pending: pendingBanners,

        rejected: rejectedBanners,

        paid: paidBanners,

        unpaid: unpaidBanners,

        active: activeBanners,

        inactive: inactiveBanners,

        expired: expiredBanners,

        scheduled: scheduledBanners,

        provider: providerBanners,

        admin: adminBanners,

        superadmin: superadminBanners,

        clicks: totalBannerClicks,

        byPlacement: bannersByPlacement,
      },


      /* ================= CHART DATA ================= */

      businessByCategory,

      businessByCity,

      businessByStatus,

    },


    meta: {
      generatedAt: now,
    },
  });
});

/* ======================================================
   SEARCH ANALYTICS
   SEARCH → RESULT → BUSINESS FUNNEL
====================================================== */
export const getSearchAnalytics = asyncHandler(
  async (req, res) => {
    const {
      range = "7d",
      startDate,
      endDate,
    } = req.query;

    const now = new Date();

    let start;
    let end = new Date(now);

    /* ====================================================
       DATE RANGE
    ==================================================== */

    switch (range) {
      case "today": {
        start = new Date(now);
        start.setHours(0, 0, 0, 0);

        end = new Date(now);
        end.setHours(23, 59, 59, 999);

        break;
      }

      case "yesterday": {
        start = new Date(now);
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);

        end = new Date(now);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);

        break;
      }

      case "30d": {
        start = new Date(now);
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);

        break;
      }

      case "90d": {
        start = new Date(now);
        start.setDate(start.getDate() - 89);
        start.setHours(0, 0, 0, 0);

        break;
      }

      case "custom": {
        if (!startDate || !endDate) {
          return res.status(400).json({
            success: false,
            message:
              "startDate and endDate are required for custom range.",
          });
        }

        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        if (
          Number.isNaN(start.getTime()) ||
          Number.isNaN(end.getTime())
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid custom date range.",
          });
        }

        if (start > end) {
          return res.status(400).json({
            success: false,
            message:
              "startDate cannot be after endDate.",
          });
        }

        break;
      }

      case "all": {
        start = null;
        end = new Date(now);

        break;
      }

      case "7d":
      default: {
        start = new Date(now);
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);

        break;
      }
    }

    /* ====================================================
       DATE FILTER
    ==================================================== */

    const dateFilter = start
      ? {
          createdAt: {
            $gte: start,
            $lte: end,
          },
        }
      : {
          createdAt: {
            $lte: end,
          },
        };

    /* ====================================================
       SEARCH EVENTS
    ==================================================== */

    const excludedAdminUsers =
  await User.find({
    role: {
      $in: ["admin", "superadmin"],
    },
  }).distinct("_id");

const searchMatch = {
  ...dateFilter,
  event: "search",
  user: {
    $nin: excludedAdminUsers,
  },
};

    const searches =
      await VisitorEvent.find(searchMatch)
        .sort({
          createdAt: -1,
        })
        .lean();

    /* ====================================================
       LISTING CLICKS
    ==================================================== */

    const listingClicks =
      await VisitorEvent.find({
        ...dateFilter,
        event: "listing_click",
      })
        .sort({
          createdAt: -1,
        })
        .lean();

    /* ====================================================
       BUSINESS VIEWS
       - Existing business_view events only
       - Does NOT touch BusinessView collection
    ==================================================== */

    const businessViews =
      await VisitorEvent.find({
        ...dateFilter,
        event: "business_view",
      })
        .lean();

    /* ====================================================
       BASIC SEARCH KPIs
    ==================================================== */

    const totalSearches =
      searches.length;

    const uniqueSearchers =
      new Set(
        searches
          .map(
            (item) =>
              item.visitorId
          )
          .filter(Boolean)
      ).size;

    const searchesWithResults =
      searches.filter(
        (item) =>
          Number(
            item.metadata?.resultCount ??
              item.metadata?.resultsCount ??
              0
          ) > 0
      ).length;

    const noResultSearches =
      searches.filter(
        (item) =>
          Number(
            item.metadata?.resultCount ??
              item.metadata?.resultsCount ??
              0
          ) === 0
      ).length;

    const totalListingClicks =
      listingClicks.length;

    const totalBusinessViews =
      businessViews.length;

    /* ====================================================
       QUERY AGGREGATION
    ==================================================== */

    const queryMap = new Map();

    searches.forEach((search) => {
      const query =
        String(
          search.query ||
            search.eventLabel ||
            ""
        ).trim();

      if (!query) {
        return;
      }

      const key =
        query.toLowerCase();

      if (!queryMap.has(key)) {
        queryMap.set(key, {
          query,

          searches: 0,

          uniqueSearchers:
            new Set(),

          resultsFound: 0,

          noResults: 0,

          resultClicks: 0,

          businessViews: 0,

          searchTypes:
            new Map(),

          cities:
            new Map(),

          categories:
            new Map(),

          lastSearchedAt:
            search.createdAt ||
            search.occurredAt ||
            null,
        });
      }

      const item =
        queryMap.get(key);

      item.searches += 1;

      if (search.visitorId) {
        item.uniqueSearchers.add(
          String(
            search.visitorId
          )
        );
      }

      const resultCount =
        Number(
          search.metadata?.resultCount ??
            search.metadata?.resultsCount ??
            0
        );

      if (resultCount > 0) {
        item.resultsFound += 1;
      } else {
        item.noResults += 1;
      }

      const searchType =
        search.metadata?.searchType ||
        search.metadata?.intent ||
        "";

      if (searchType) {
        item.searchTypes.set(
          searchType,
          (item.searchTypes.get(
            searchType
          ) || 0) + 1
        );
      }

      const citySlug =
        search.metadata?.citySlug ||
        "";

      if (citySlug) {
        item.cities.set(
          citySlug,
          (item.cities.get(
            citySlug
          ) || 0) + 1
        );
      }

      const categorySlug =
        search.metadata?.categorySlug ||
        "";

      if (categorySlug) {
        item.categories.set(
          categorySlug,
          (item.categories.get(
            categorySlug
          ) || 0) + 1
        );
      }
    });

    /* ====================================================
       MATCH CLICKS TO SEARCH QUERY
    ==================================================== */

    listingClicks.forEach((click) => {
      const query =
        String(
          click.query ||
            click.eventLabel ||
            click.metadata?.searchQuery ||
            ""
        ).trim();

      if (!query) {
        return;
      }

      const key =
        query.toLowerCase();

      const item =
        queryMap.get(key);

      if (item) {
        item.resultClicks += 1;
      }
    });

    /* ====================================================
       MATCH BUSINESS VIEWS TO SEARCH QUERY
    ==================================================== */

    businessViews.forEach((view) => {
      const query =
        String(
          view.query ||
            view.metadata?.searchQuery ||
            ""
        ).trim();

      if (!query) {
        return;
      }

      const key =
        query.toLowerCase();

      const item =
        queryMap.get(key);

      if (item) {
        item.businessViews += 1;
      }
    });

    /* ====================================================
       FORMAT QUERY DATA
    ==================================================== */

    const topQueries =
      Array.from(
        queryMap.values()
      )
        .map((item) => {
          const clickRate =
            item.searches > 0
              ? (item.resultClicks /
                  item.searches) *
                100
              : 0;

          const resultRate =
            item.searches > 0
              ? (item.resultsFound /
                  item.searches) *
                100
              : 0;

          const topSearchType =
            Array.from(
              item.searchTypes.entries()
            ).sort(
              (a, b) =>
                b[1] - a[1]
            )[0]?.[0] || "";

          const topCity =
            Array.from(
              item.cities.entries()
            ).sort(
              (a, b) =>
                b[1] - a[1]
            )[0]?.[0] || "";

          const topCategory =
            Array.from(
              item.categories.entries()
            ).sort(
              (a, b) =>
                b[1] - a[1]
            )[0]?.[0] || "";

          return {
            query: item.query,

            searches:
              item.searches,

            uniqueSearchers:
              item.uniqueSearchers.size,

            resultsFound:
              item.resultsFound,

            noResults:
              item.noResults,

            resultClicks:
              item.resultClicks,

            businessViews:
              item.businessViews,

            clickRate,

            resultRate,

            searchType:
              topSearchType,

            citySlug:
              topCity,

            categorySlug:
              topCategory,

            lastSearchedAt:
              item.lastSearchedAt,
          };
        })
        .sort(
          (a, b) =>
            b.searches -
            a.searches
        );

    /* ====================================================
       NO RESULT SEARCHES
    ==================================================== */

    const noResultQueries =
      topQueries
        .filter(
          (item) =>
            item.noResults > 0
        )
        .sort(
          (a, b) =>
            b.noResults -
            a.noResults
        );

    /* ====================================================
       SEARCH TYPE BREAKDOWN
    ==================================================== */

    const searchTypeMap =
      new Map();

    searches.forEach((search) => {
      const type =
        search.metadata?.searchType ||
        search.metadata?.intent ||
        "unknown";

      searchTypeMap.set(
        type,
        (searchTypeMap.get(type) ||
          0) + 1
      );
    });

    const searchTypes =
      Array.from(
        searchTypeMap.entries()
      )
        .map(
          ([type, count]) => ({
            type,
            count,
            percentage:
              totalSearches > 0
                ? (count /
                    totalSearches) *
                  100
                : 0,
          })
        )
        .sort(
          (a, b) =>
            b.count -
            a.count
        );

    /* ====================================================
       DAILY SEARCH TREND
    ==================================================== */

    const trendMap =
      new Map();

    searches.forEach((search) => {
      const eventDate =
        search.createdAt ||
        search.occurredAt;

      if (!eventDate) {
        return;
      }

      const date =
        new Date(eventDate)
          .toISOString()
          .slice(0, 10);

      if (!trendMap.has(date)) {
        trendMap.set(date, {
          date,
          searches: 0,
          uniqueSearchers:
            new Set(),
          noResults: 0,
          resultClicks: 0,
        });
      }

      const item =
        trendMap.get(date);

      item.searches += 1;

      if (search.visitorId) {
        item.uniqueSearchers.add(
          String(
            search.visitorId
          )
        );
      }

      const resultCount =
        Number(
          search.metadata?.resultCount ??
            search.metadata?.resultsCount ??
            0
        );

      if (resultCount === 0) {
        item.noResults += 1;
      }
    });

    listingClicks.forEach((click) => {
      const eventDate =
        click.createdAt ||
        click.occurredAt;

      if (!eventDate) {
        return;
      }

      const date =
        new Date(eventDate)
          .toISOString()
          .slice(0, 10);

      if (trendMap.has(date)) {
        trendMap.get(
          date
        ).resultClicks += 1;
      }
    });

    const trend =
      Array.from(
        trendMap.values()
      )
        .map((item) => ({
          date: item.date,

          searches:
            item.searches,

          uniqueSearchers:
            item.uniqueSearchers.size,

          noResults:
            item.noResults,

          resultClicks:
            item.resultClicks,
        }))
        .sort(
          (a, b) =>
            a.date.localeCompare(
              b.date
            )
        );

    /* ====================================================
       FUNNEL
    ==================================================== */

    const searchToClickRate =
      totalSearches > 0
        ? (totalListingClicks /
            totalSearches) *
          100
        : 0;

    const searchToBusinessViewRate =
      totalSearches > 0
        ? (totalBusinessViews /
            totalSearches) *
          100
        : 0;

    const noResultRate =
      totalSearches > 0
        ? (noResultSearches /
            totalSearches) *
          100
        : 0;

    /* ====================================================
       RESPONSE
    ==================================================== */

    return res.json({
      success: true,

      data: {
        range,

        startDate: start
          ? start.toISOString()
          : null,

        endDate: end
          ? end.toISOString()
          : null,

        totals: {
          searches:
            totalSearches,

          uniqueSearchers:
            uniqueSearchers,

          searchesWithResults:
            searchesWithResults,

          noResultSearches:
            noResultSearches,

          noResultRate,

          resultClicks:
            totalListingClicks,

          businessViews:
            totalBusinessViews,
        },

        funnel: {
          searches:
            totalSearches,

          resultClicks:
            totalListingClicks,

          businessViews:
            totalBusinessViews,

          searchToClickRate,

          searchToBusinessViewRate,
        },

        topQueries,

        noResultQueries,

        searchTypes,

        trend,
      },

      meta: {
        generatedAt: now,
      },
    });
  }
);



/* ======================================================
   VISITOR ANALYTICS
   INDUSTRY-STANDARD VISITOR → SESSION → PAGE VIEW → EVENT
====================================================== */
export const getVisitorAnalytics = asyncHandler(
  async (req, res) => {
    const {
      range = "7d",
      startDate,
      endDate,
    } = req.query;

    const now = new Date();

    let start;
    let end = new Date(now);

    /* ====================================================
       DATE RANGE
    ==================================================== */

    switch (range) {
      case "today": {
        start = new Date(now);
        start.setHours(0, 0, 0, 0);

        end = new Date(now);
        end.setHours(23, 59, 59, 999);

        break;
      }

      case "yesterday": {
        start = new Date(now);
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);

        end = new Date(now);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);

        break;
      }

      case "30d": {
        start = new Date(now);
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);

        break;
      }

      case "90d": {
        start = new Date(now);
        start.setDate(start.getDate() - 89);
        start.setHours(0, 0, 0, 0);

        break;
      }

      case "custom": {
        if (!startDate || !endDate) {
          return res.status(400).json({
            success: false,
            message:
              "startDate and endDate are required for custom range.",
          });
        }

        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        if (
          Number.isNaN(start.getTime()) ||
          Number.isNaN(end.getTime())
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid custom date range.",
          });
        }

        if (start > end) {
          return res.status(400).json({
            success: false,
            message:
              "startDate cannot be after endDate.",
          });
        }

        break;
      }

      case "all": {
        start = null;
        end = new Date(now);
        break;
      }

      case "7d":
      default: {
        start = new Date(now);
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);

        break;
      }
    }

    /* ====================================================
       DATE FILTERS
    ==================================================== */

    const visitorDateFilter = {};

    const sessionDateFilter = {};

    const pageViewDateFilter = {};

    const eventDateFilter = {};

    if (start) {
      visitorDateFilter.createdAt = {
        $gte: start,
        $lte: end,
      };

      sessionDateFilter.createdAt = {
        $gte: start,
        $lte: end,
      };

      pageViewDateFilter.createdAt = {
        $gte: start,
        $lte: end,
      };

      eventDateFilter.createdAt = {
        $gte: start,
        $lte: end,
      };
    } else {
      visitorDateFilter.createdAt = {
        $lte: end,
      };

      sessionDateFilter.createdAt = {
        $lte: end,
      };

      pageViewDateFilter.createdAt = {
        $lte: end,
      };

      eventDateFilter.createdAt = {
        $lte: end,
      };
    }

    /* ====================================================
       VISITOR BREAKDOWN
    ==================================================== */

    const visitorBreakdown =
      await Visitor.aggregate([
        {
          $match: visitorDateFilter,
        },

        {
          $group: {
            _id: "$visitorType",

            uniqueVisitors: {
              $sum: 1,
            },
          },
        },
      ]);

    /* ====================================================
       SESSION BREAKDOWN
    ==================================================== */

    const sessionBreakdown =
      await VisitorSession.aggregate([
        {
          $match: sessionDateFilter,
        },

        {
          $group: {
            _id: "$visitorType",

            sessions: {
              $sum: 1,
            },
          },
        },
      ]);

    /* ====================================================
       PAGE VIEW BREAKDOWN
    ==================================================== */

    const pageViewBreakdown =
      await PageView.aggregate([
        {
          $match: pageViewDateFilter,
        },

        {
          $group: {
            _id: "$visitorType",

            pageViews: {
              $sum: 1,
            },
          },
        },
      ]);

    /* ====================================================
       HELPER
    ==================================================== */

    const getSegment = (type) => {
      const visitor =
        visitorBreakdown.find(
          (item) => item._id === type
        );

      const session =
        sessionBreakdown.find(
          (item) => item._id === type
        );

      const pageView =
        pageViewBreakdown.find(
          (item) => item._id === type
        );

      return {
        uniqueVisitors:
          visitor?.uniqueVisitors || 0,

        sessions:
          session?.sessions || 0,

        pageViews:
          pageView?.pageViews || 0,

        percentage: 0,
      };
    };

    const guest = getSegment("guest");
    const user = getSegment("user");
    const provider = getSegment("provider");

    /* ====================================================
       TOTALS
    ==================================================== */

    const totalUniqueVisitors =
      guest.uniqueVisitors +
      user.uniqueVisitors +
      provider.uniqueVisitors;

    const totalSessions =
      guest.sessions +
      user.sessions +
      provider.sessions;

    const totalPageViews =
      guest.pageViews +
      user.pageViews +
      provider.pageViews;

    /* ====================================================
       PERCENTAGES
    ==================================================== */

    if (totalUniqueVisitors > 0) {
      guest.percentage =
        (guest.uniqueVisitors /
          totalUniqueVisitors) *
        100;

      user.percentage =
        (user.uniqueVisitors /
          totalUniqueVisitors) *
        100;

      provider.percentage =
        (provider.uniqueVisitors /
          totalUniqueVisitors) *
        100;
    }

    /* ====================================================
       DAILY TREND
    ==================================================== */

    const trendMatch = start
      ? {
          createdAt: {
            $gte: start,
            $lte: end,
          },
        }
      : {
          createdAt: {
            $lte: end,
          },
        };

    const trend =
      await PageView.aggregate([
        {
          $match: trendMatch,
        },

        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },

            pageViews: {
              $sum: 1,
            },

            visitors: {
              $addToSet: "$visitorId",
            },

            sessions: {
              $addToSet: "$sessionId",
            },
          },
        },

        {
          $project: {
            _id: 0,

            date: "$_id",

            pageViews: 1,

            visitors: {
              $size: "$visitors",
            },

            sessions: {
              $size: "$sessions",
            },
          },
        },

        {
          $sort: {
            date: 1,
          },
        },
      ]);

    /* ====================================================
       EVENT METRICS
    ==================================================== */

    const events =
      await VisitorEvent.aggregate([
        {
          $match: eventDateFilter,
        },

        {
          $group: {
            _id: "$event",

            count: {
              $sum: 1,
            },
          },
        },

        {
          $project: {
            _id: 0,

            event: "$_id",

            count: 1,
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]);

    /* ====================================================
       RESPONSE
    ==================================================== */

    return res.json({
      success: true,

      data: {
        range,

        startDate: start
          ? start.toISOString()
          : null,

        endDate: end
          ? end.toISOString()
          : null,

        totals: {
          uniqueVisitors:
            totalUniqueVisitors,

          sessions:
            totalSessions,

          pageViews:
            totalPageViews,
        },

        segments: {
          guest,
          user,
          provider,
        },

        trend,

        events,
      },

      meta: {
        generatedAt: now,
      },
    });
  }
);

// ======================================================
// UPDATE ADMIN LEAD STATUS
// ======================================================

export const updateAdminLeadStatus = asyncHandler(
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "new",
      "contacted",
      "follow_up",
      "converted",
      "closed",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead status",
      });
    }

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // ================================
    // STATUS
    // ================================

    lead.status = status;

    // ================================
    // CONTACT TRACKING
    // ================================

    if (
      status === "contacted" ||
      status === "converted"
    ) {
      if (!lead.lastContactedAt) {
        lead.lastContactedAt = new Date();
      }
    }

    // ================================
    // CLOSED TRACKING
    // ================================

    if (status === "closed") {
      lead.closedAt = new Date();
      lead.cancelledAt = null;
    }

    // ================================
    // CANCELLED TRACKING
    // ================================

    if (status === "cancelled") {
      lead.cancelledAt = new Date();
      lead.closedAt = null;
    }

    // ================================
    // REOPEN / OTHER STATUS
    // ================================

    if (
      status !== "closed" &&
      status !== "cancelled"
    ) {
      lead.closedAt = null;
      lead.cancelledAt = null;
    }

    await lead.save();

    const updatedLead = await Lead.findById(lead._id)
      .populate(
        "business",
        "name slug cityId cityName owner"
      )
      .populate(
        "userId",
        "name email phone"
      );

    res.status(200).json({
      success: true,
      message: "Lead status updated successfully",
      lead: updatedLead,
    });
  }
);


// ======================================================
// UPDATE ADMIN LEAD NOTES
// ======================================================

export const updateAdminLeadNotes = asyncHandler(
  async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    lead.notes = notes || "";

    await lead.save();

    const updatedLead = await Lead.findById(lead._id)
      .populate(
        "business",
        "name slug cityId cityName owner"
      )
      .populate(
        "userId",
        "name email phone"
      );

    res.status(200).json({
      success: true,
      message: "Lead notes updated successfully",
      lead: updatedLead,
    });
  }
);

/* ======================================================
   REPORTS
====================================================== */
export const getReports = async (req, res) => {
  try {
    const businesses = await Business.find()
      .populate("cityId", "name slug")
      .populate("categoryId", "name slug");

    res.json({
      success: true,
      data: businesses,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
      error: err.message,
    });
  }
};

/* ======================================================
   SYSTEM SETTINGS
====================================================== */
export const getSystemSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.find();

  res.json({
    success: true,
    data: settings,
  });
});

/* ======================================================
   UPDATE SYSTEM SETTINGS
====================================================== */
export const updateSystemSettings = asyncHandler(
  async (req, res) => {
    const {
      siteName,
      siteLogo,
      contactEmail,
      contactPhone,
      maintenanceMode,
      footerText,
      socialLinks,
    } = req.body;

    // ====================================================
    // VALIDATION
    // ====================================================

    if (!contactEmail?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Contact email is required.",
      });
    }

    // ====================================================
    // FIND EXISTING SETTINGS
    // ====================================================

    let settings = await SystemSettings.findOne();

    // ====================================================
    // CREATE SETTINGS
    // ====================================================

    if (!settings) {
      settings = new SystemSettings({
        siteName:
          siteName?.trim() || "ServDial",

        siteLogo:
          siteLogo || "",

        contactEmail:
          contactEmail.trim(),

        contactPhone:
          contactPhone || "",

        maintenanceMode:
          Boolean(maintenanceMode),

        footerText:
          footerText || "",

        socialLinks: {
          facebook:
            socialLinks?.facebook || "",

          twitter:
            socialLinks?.twitter || "",

          instagram:
            socialLinks?.instagram || "",

          linkedin:
            socialLinks?.linkedin || "",
        },

        createdBy:
          req.user?._id,

        updatedBy:
          req.user?._id,
      });
    }

    // ====================================================
    // UPDATE EXISTING SETTINGS
    // ====================================================

    else {
      settings.siteName =
        siteName?.trim() ||
        settings.siteName;

      settings.siteLogo =
        siteLogo ??
        settings.siteLogo;

      settings.contactEmail =
        contactEmail.trim();

      settings.contactPhone =
        contactPhone ??
        settings.contactPhone;

      settings.maintenanceMode =
        maintenanceMode ??
        settings.maintenanceMode;

      settings.footerText =
        footerText ??
        settings.footerText;

      settings.socialLinks = {
        facebook:
          socialLinks?.facebook ??
          settings.socialLinks?.facebook ??
          "",

        twitter:
          socialLinks?.twitter ??
          settings.socialLinks?.twitter ??
          "",

        instagram:
          socialLinks?.instagram ??
          settings.socialLinks?.instagram ??
          "",

        linkedin:
          socialLinks?.linkedin ??
          settings.socialLinks?.linkedin ??
          "",
      };

      settings.updatedBy =
        req.user?._id;
    }

    // ====================================================
    // SAVE
    // ====================================================

    await settings.save();

    // ====================================================
    // RESPONSE
    // ====================================================

    res.json({
      success: true,

      message:
        "System settings updated successfully",

      data: settings,
    });
  }
);

/* ======================================================
   ACTIVITY LOGS
====================================================== */
export const getActivityLogs = asyncHandler(async (req, res) => {
  const logs = await ActivityLogs.find()
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({
    success: true,
    data: logs,
  });
});

/* ======================================================
   PASSWORD CHANGE
====================================================== */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  const match = await bcrypt.compare(currentPassword, user.password);

  if (!match) {
    return res.status(400).json({
      success: false,
      message: "Current password incorrect",
    });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({
    success: true,
    message: "Password updated",
  });
});

/* ======================================================
   USERS
====================================================== */
export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password");

  res.json({
    success: true,
    data: users,
  });
});


/* ======================================================
   DELETE USER
====================================================== */
export const deleteUser = asyncHandler(async (req, res) => {

  const user = await User.findById(req.params.id);


  if (!user) {

    res.status(404);

    throw new Error(
      "User not found"
    );

  }


  // safety: admin खुद को delete ना कर सके
  if (
    user._id.toString() === req.user._id.toString()
  ) {

    res.status(400);

    throw new Error(
      "You cannot delete your own account"
    );

  }


  await user.deleteOne();


  res.json({

    success:true,

    message:"User deleted successfully"

  });


});

/* ======================================================
   ADMINS
====================================================== */
export const getAdmins = asyncHandler(async (req, res) => {
  const { role } = req.query;

  const query = {
    role: { $in: ["admin", "superadmin"] },
  };

  if (role) {
    query.role = role;
  }

  const admins = await User.find(query)
    .select("-password")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: admins,
  });
});

/* ======================================================
   CATEGORY
====================================================== */
export const createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;

  const existing = await Category.findOne({ name });

  if (existing) {
    return res.status(400).json({
      success: false,
      message: "Category already exists",
    });
  }

  const category = await Category.create({ name });

  res.status(201).json({
    success: true,
    data: category,
  });
});