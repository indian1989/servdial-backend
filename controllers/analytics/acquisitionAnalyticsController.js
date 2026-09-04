// backend/controllers/analytics/acquisitionAnalyticsController.js

import asyncHandler from "express-async-handler";

import PageView from "../../models/PageView.js";

/**
 * =========================================================
 * TRAFFIC SOURCE & ACQUISITION ANALYTICS
 * =========================================================
 *
 * INCLUDED:
 * - guest
 * - user
 * - provider
 *
 * EXCLUDED:
 * - admin
 * - superadmin
 *
 * DATA SOURCE:
 * - PageView
 *
 * ANALYTICS:
 * - Unique visitors
 * - Sessions
 * - Page views
 * - Source performance
 * - Referrers
 * - UTM source
 * - UTM medium
 * - UTM campaign
 * - Device performance
 * - Daily trend
 * - Conversion-style page-view metrics
 *
 * =========================================================
 */

const PUBLIC_VISITOR_TYPES = [
  "guest",
  "user",
  "provider",
];

const TRAFFIC_SOURCES = [
  "direct",
  "organic",
  "social",
  "referral",
  "campaign",
  "unknown",
];

/**
 * =========================================================
 * DATE RANGE
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
 * RATE
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
 * GET ACQUISITION ANALYTICS
 * =========================================================
 */
export const getAcquisitionAnalytics =
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
     */
    const baseFilter = {
      visitorType: {
        $in: PUBLIC_VISITOR_TYPES,
      },
    };

    if (start && end) {
      baseFilter.viewedAt = {
        $gte: start,
        $lte: end,
      };
    }

    /**
     * =====================================================
     * TOTALS
     * =====================================================
     */
    const [
      totalPageViews,
      uniqueVisitors,
      uniqueSessions,
    ] = await Promise.all([
      PageView.countDocuments(baseFilter),

      PageView.distinct(
        "visitorId",
        baseFilter
      ),

      PageView.distinct(
        "sessionId",
        baseFilter
      ),
    ]);

    /**
     * =====================================================
     * SOURCE BREAKDOWN
     * =====================================================
     */
    const sourcePerformance =
      await PageView.aggregate([
        {
          $match: baseFilter,
        },

        {
          $group: {
            _id: {
              $ifNull: [
                "$source",
                "unknown",
              ],
            },

            pageViews: {
              $sum: 1,
            },

            uniqueVisitors: {
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

            source: "$_id",

            pageViews: 1,

            uniqueVisitors: {
              $size: "$uniqueVisitors",
            },

            sessions: {
              $size: "$sessions",
            },
          },
        },

        {
          $sort: {
            pageViews: -1,
          },
        },
      ]);

    /**
     * =====================================================
     * ADD SOURCE PERCENTAGE
     * =====================================================
     */
    const sourceData =
      sourcePerformance.map(
        (item) => ({
          ...item,

          pageViewPercentage:
            calculateRate(
              item.pageViews,
              totalPageViews
            ),

          visitorPercentage:
            calculateRate(
              item.uniqueVisitors,
              uniqueVisitors.length
            ),

          sessionPercentage:
            calculateRate(
              item.sessions,
              uniqueSessions.length
            ),
        })
      );

    /**
     * =====================================================
     * VISITOR TYPE
     * =====================================================
     */
    const visitorTypePerformance =
      await PageView.aggregate([
        {
          $match: baseFilter,
        },

        {
          $group: {
            _id: "$visitorType",

            pageViews: {
              $sum: 1,
            },

            uniqueVisitors: {
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

            visitorType: "$_id",

            pageViews: 1,

            uniqueVisitors: {
              $size: "$uniqueVisitors",
            },

            sessions: {
              $size: "$sessions",
            },
          },
        },

        {
          $sort: {
            pageViews: -1,
          },
        },
      ]);

    /**
     * =====================================================
     * REFERRERS
     * =====================================================
     */
    const referrers =
      await PageView.aggregate([
        {
          $match: {
            ...baseFilter,

            referrer: {
              $nin: [
                "",
                null,
              ],
            },
          },
        },

        {
          $group: {
            _id: "$referrer",

            pageViews: {
              $sum: 1,
            },

            uniqueVisitors: {
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

            referrer: "$_id",

            pageViews: 1,

            uniqueVisitors: {
              $size: "$uniqueVisitors",
            },

            sessions: {
              $size: "$sessions",
            },
          },
        },

        {
          $sort: {
            pageViews: -1,
          },
        },

        {
          $limit: 50,
        },
      ]);

    /**
     * =====================================================
     * UTM SOURCE
     * =====================================================
     */
    const utmSources =
      await PageView.aggregate([
        {
          $match: {
            ...baseFilter,

            utmSource: {
              $nin: [
                "",
                null,
              ],
            },
          },
        },

        {
          $group: {
            _id: "$utmSource",

            pageViews: {
              $sum: 1,
            },

            uniqueVisitors: {
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

            utmSource: "$_id",

            pageViews: 1,

            uniqueVisitors: {
              $size: "$uniqueVisitors",
            },

            sessions: {
              $size: "$sessions",
            },
          },
        },

        {
          $sort: {
            pageViews: -1,
          },
        },

        {
          $limit: 50,
        },
      ]);

    /**
     * =====================================================
     * UTM MEDIUM
     * =====================================================
     */
    const utmMediums =
      await PageView.aggregate([
        {
          $match: {
            ...baseFilter,

            utmMedium: {
              $nin: [
                "",
                null,
              ],
            },
          },
        },

        {
          $group: {
            _id: "$utmMedium",

            pageViews: {
              $sum: 1,
            },

            uniqueVisitors: {
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

            utmMedium: "$_id",

            pageViews: 1,

            uniqueVisitors: {
              $size: "$uniqueVisitors",
            },

            sessions: {
              $size: "$sessions",
            },
          },
        },

        {
          $sort: {
            pageViews: -1,
          },
        },

        {
          $limit: 50,
        },
      ]);

    /**
     * =====================================================
     * UTM CAMPAIGNS
     * =====================================================
     */
    const campaigns =
      await PageView.aggregate([
        {
          $match: {
            ...baseFilter,

            utmCampaign: {
              $nin: [
                "",
                null,
              ],
            },
          },
        },

        {
          $group: {
            _id: "$utmCampaign",

            pageViews: {
              $sum: 1,
            },

            uniqueVisitors: {
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

            campaign: "$_id",

            pageViews: 1,

            uniqueVisitors: {
              $size: "$uniqueVisitors",
            },

            sessions: {
              $size: "$sessions",
            },
          },
        },

        {
          $sort: {
            pageViews: -1,
          },
        },

        {
          $limit: 50,
        },
      ]);

    /**
     * =====================================================
     * DEVICE PERFORMANCE
     * =====================================================
     */
    const devicePerformance =
      await PageView.aggregate([
        {
          $match: baseFilter,
        },

        {
          $group: {
            _id: {
              $ifNull: [
                "$deviceType",
                "unknown",
              ],
            },

            pageViews: {
              $sum: 1,
            },

            uniqueVisitors: {
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

            deviceType: "$_id",

            pageViews: 1,

            uniqueVisitors: {
              $size: "$uniqueVisitors",
            },

            sessions: {
              $size: "$sessions",
            },
          },
        },

        {
          $sort: {
            pageViews: -1,
          },
        },
      ]);

    /**
     * =====================================================
     * DAILY TREND
     * =====================================================
     */
    const trend =
      await PageView.aggregate([
        {
          $match: baseFilter,
        },

        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$viewedAt",
              },
            },

            pageViews: {
              $sum: 1,
            },

            uniqueVisitors: {
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

            uniqueVisitors: {
              $size: "$uniqueVisitors",
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

    /**
     * =====================================================
     * PAGE TYPE BY SOURCE
     * =====================================================
     */
    const sourcePageTypes =
      await PageView.aggregate([
        {
          $match: baseFilter,
        },

        {
          $group: {
            _id: {
              source: {
                $ifNull: [
                  "$source",
                  "unknown",
                ],
              },

              pageType: {
                $ifNull: [
                  "$pageType",
                  "other",
                ],
              },
            },

            pageViews: {
              $sum: 1,
            },
          },
        },

        {
          $project: {
            _id: 0,

            source: "$_id.source",

            pageType:
              "$_id.pageType",

            pageViews: 1,
          },
        },

        {
          $sort: {
            pageViews: -1,
          },
        },

        {
          $limit: 100,
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
          pageViews:
            totalPageViews,

          uniqueVisitors:
            uniqueVisitors.length,

          sessions:
            uniqueSessions.length,

          averagePageViewsPerVisitor:
            uniqueVisitors.length > 0
              ? Number(
                  (
                    totalPageViews /
                    uniqueVisitors.length
                  ).toFixed(2)
                )
              : 0,

          averagePageViewsPerSession:
            uniqueSessions.length > 0
              ? Number(
                  (
                    totalPageViews /
                    uniqueSessions.length
                  ).toFixed(2)
                )
              : 0,
        },

        sources: sourceData,

        visitorTypes:
          visitorTypePerformance,

        referrers,

        utmSources,

        utmMediums,

        campaigns,

        devices:
          devicePerformance,

        trend,

        sourcePageTypes,
      },

      meta: {
        availableSources:
          TRAFFIC_SOURCES,

        generatedAt:
          new Date().toISOString(),
      },
    });
  });