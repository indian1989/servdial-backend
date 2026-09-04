// backend/controllers/analytics/businessFunnelAnalyticsController.js

import asyncHandler from "express-async-handler";

import VisitorEvent from "../../models/VisitorEvent.js";

/**
 * =========================================================
 * BUSINESS FUNNEL ANALYTICS CONTROLLER
 * =========================================================
 *
 * RESPONSIBILITY:
 *
 * - Business funnel analytics for Admin Panel
 * - Business views
 * - Unique business-view visitors
 * - Calls
 * - WhatsApp
 * - Directions
 * - Website clicks
 * - Shares
 * - Favorites
 * - Conversion rates
 * - Daily trend
 * - Business-wise performance
 *
 * INCLUDED VISITORS:
 *
 * - guest
 * - user
 * - provider
 *
 * EXCLUDED:
 *
 * - admin
 * - superadmin
 *
 * IMPORTANT:
 *
 * - Existing BusinessView / BusinessClick analytics
 *   are NOT replaced.
 * - Business.views is NOT incremented here.
 * - This controller only reads VisitorEvent analytics.
 *
 * =========================================================
 */

const PUBLIC_VISITOR_TYPES = [
  "guest",
  "user",
  "provider",
];

const BUSINESS_FUNNEL_EVENTS = [
  "business_view",
  "call",
  "whatsapp",
  "directions",
  "website_click",
  "share",
  "favorite",
];

/**
 * =========================================================
 * RANGE HELPER
 * =========================================================
 */
const getDateRange = ({
  range,
  startDate,
  endDate,
}) => {
  const now = new Date();

  let start = null;
  let end = null;

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

      end = new Date(now);
      end.setHours(23, 59, 59, 999);

      break;
    }

    case "90d": {
      start = new Date(now);
      start.setDate(start.getDate() - 89);
      start.setHours(0, 0, 0, 0);

      end = new Date(now);
      end.setHours(23, 59, 59, 999);

      break;
    }

    case "custom": {
      if (!startDate || !endDate) {
        return {
          error:
            "startDate and endDate are required for custom range.",
        };
      }

      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
      ) {
        return {
          error:
            "Invalid custom date range.",
        };
      }

      if (start > end) {
        return {
          error:
            "startDate cannot be after endDate.",
        };
      }

      break;
    }

    case "all": {
      start = null;
      end = null;

      break;
    }

    case "7d":
    default: {
      start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);

      end = new Date(now);
      end.setHours(23, 59, 59, 999);

      break;
    }
  }

  return {
    start,
    end,
  };
};

/**
 * =========================================================
 * PERCENTAGE HELPER
 * =========================================================
 */
const calculateRate = (
  numerator,
  denominator
) => {
  if (
    !Number.isFinite(Number(numerator)) ||
    !Number.isFinite(Number(denominator)) ||
    Number(denominator) <= 0
  ) {
    return 0;
  }

  return Number(
    (
      (Number(numerator) /
        Number(denominator)) *
      100
    ).toFixed(2)
  );
};

/**
 * =========================================================
 * GET BUSINESS FUNNEL ANALYTICS
 * =========================================================
 */
export const getBusinessFunnelAnalytics =
  asyncHandler(async (req, res) => {
    const {
      range = "7d",
      startDate,
      endDate,
    } = req.query;

    const resolvedRange =
      String(range || "7d").toLowerCase();

    /**
     * -----------------------------------------------------
     * DATE RANGE
     * -----------------------------------------------------
     */
    const dateRange =
      getDateRange({
        range: resolvedRange,
        startDate,
        endDate,
      });

    if (dateRange.error) {
      return res.status(400).json({
        success: false,
        message: dateRange.error,
      });
    }

    const {
      start,
      end,
    } = dateRange;

    /**
     * -----------------------------------------------------
     * BASE FILTER
     * -----------------------------------------------------
     *
     * Only public visitor types are allowed.
     *
     * Admin and Superadmin are explicitly excluded.
     */
    const baseFilter = {
      visitorType: {
        $in: PUBLIC_VISITOR_TYPES,
      },

      event: {
        $in: BUSINESS_FUNNEL_EVENTS,
      },
    };

    if (start && end) {
      baseFilter.createdAt = {
        $gte: start,
        $lte: end,
      };
    }

    /**
     * -----------------------------------------------------
     * BASIC EVENT COUNTS
     * -----------------------------------------------------
     */
    const [
      businessViews,
      calls,
      whatsapp,
      directions,
      websiteClicks,
      shares,
      favorites,
    ] = await Promise.all([
      VisitorEvent.countDocuments({
        ...baseFilter,
        event: "business_view",
      }),

      VisitorEvent.countDocuments({
        ...baseFilter,
        event: "call",
      }),

      VisitorEvent.countDocuments({
        ...baseFilter,
        event: "whatsapp",
      }),

      VisitorEvent.countDocuments({
        ...baseFilter,
        event: "directions",
      }),

      VisitorEvent.countDocuments({
        ...baseFilter,
        event: "website_click",
      }),

      VisitorEvent.countDocuments({
        ...baseFilter,
        event: "share",
      }),

      VisitorEvent.countDocuments({
        ...baseFilter,
        event: "favorite",
      }),
    ]);

    /**
     * -----------------------------------------------------
     * UNIQUE BUSINESS VIEW VISITORS
     * -----------------------------------------------------
     */
    const uniqueBusinessViewVisitorIds =
      await VisitorEvent.distinct(
        "visitorId",
        {
          ...baseFilter,
          event: "business_view",
        }
      );

    const uniqueBusinessViewVisitors =
      uniqueBusinessViewVisitorIds.length;

    /**
     * -----------------------------------------------------
     * TOTAL ACTIONS
     * -----------------------------------------------------
     */
    const totalActions =
      calls +
      whatsapp +
      directions +
      websiteClicks +
      shares +
      favorites;

    /**
     * -----------------------------------------------------
     * OVERALL CONVERSION
     * -----------------------------------------------------
     */
    const conversionRate =
      calculateRate(
        totalActions,
        businessViews
      );

    /**
     * -----------------------------------------------------
     * FUNNEL RATES
     * -----------------------------------------------------
     */
    const viewToCallRate =
      calculateRate(
        calls,
        businessViews
      );

    const viewToWhatsappRate =
      calculateRate(
        whatsapp,
        businessViews
      );

    const viewToDirectionsRate =
      calculateRate(
        directions,
        businessViews
      );

    const viewToWebsiteRate =
      calculateRate(
        websiteClicks,
        businessViews
      );

    const viewToShareRate =
      calculateRate(
        shares,
        businessViews
      );

    const viewToFavoriteRate =
      calculateRate(
        favorites,
        businessViews
      );

    /**
     * =====================================================
     * DAILY TREND
     * =====================================================
     */
    const trend = await VisitorEvent.aggregate([
      {
        $match: baseFilter,
      },

      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },

          businessViews: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$event",
                    "business_view",
                  ],
                },
                1,
                0,
              ],
            },
          },

          calls: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$event",
                    "call",
                  ],
                },
                1,
                0,
              ],
            },
          },

          whatsapp: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$event",
                    "whatsapp",
                  ],
                },
                1,
                0,
              ],
            },
          },

          directions: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$event",
                    "directions",
                  ],
                },
                1,
                0,
              ],
            },
          },

          websiteClicks: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$event",
                    "website_click",
                  ],
                },
                1,
                0,
              ],
            },
          },

          shares: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$event",
                    "share",
                  ],
                },
                1,
                0,
              ],
            },
          },

          favorites: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$event",
                    "favorite",
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },

      {
        $project: {
          _id: 0,
          date: "$_id",

          businessViews: 1,
          calls: 1,
          whatsapp: 1,
          directions: 1,
          websiteClicks: 1,
          shares: 1,
          favorites: 1,
        },
      },

      {
        $sort: {
          date: 1,
        },
      },
    ]);

    /**
     * =====================================================
     * BUSINESS-WISE PERFORMANCE
     * =====================================================
     */
    const businessPerformance =
      await VisitorEvent.aggregate([
        {
          $match: {
            ...baseFilter,

            business: {
              $ne: null,
            },
          },
        },

        {
          $group: {
            _id: "$business",

            businessViews: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$event",
                      "business_view",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            calls: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$event",
                      "call",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            whatsapp: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$event",
                      "whatsapp",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            directions: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$event",
                      "directions",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            websiteClicks: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$event",
                      "website_click",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            shares: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$event",
                      "share",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            favorites: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$event",
                      "favorite",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },

        {
          $sort: {
            businessViews: -1,
          },
        },

        {
          $limit: 100,
        },

        {
          $lookup: {
            from: "businesses",
            localField: "_id",
            foreignField: "_id",
            as: "businessData",
          },
        },

        {
          $unwind: {
            path: "$businessData",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $project: {
            _id: 0,

            businessId: "$_id",

            businessName:
              "$businessData.name",

            businessSlug:
              "$businessData.slug",

            businessViews: 1,
            calls: 1,
            whatsapp: 1,
            directions: 1,
            websiteClicks: 1,
            shares: 1,
            favorites: 1,
          },
        },
      ]);

    /**
     * =====================================================
     * RESPONSE
     * =====================================================
     */
    return res.json({
      success: true,

      data: {
        range:
          resolvedRange,

        startDate:
          start?.toISOString() ||
          null,

        endDate:
          end?.toISOString() ||
          null,

        totals: {
          businessViews,

          uniqueBusinessViewVisitors,

          calls,
          whatsapp,
          directions,
          websiteClicks,
          shares,
          favorites,

          totalActions,

          conversionRate,
        },

        funnel: {
          businessViews,

          calls,
          whatsapp,
          directions,
          websiteClicks,
          shares,
          favorites,

          viewToCallRate,
          viewToWhatsappRate,
          viewToDirectionsRate,
          viewToWebsiteRate,
          viewToShareRate,
          viewToFavoriteRate,
        },

        trend,

        businessPerformance,
      },

      meta: {
        generatedAt:
          new Date().toISOString(),
      },
    });
  });