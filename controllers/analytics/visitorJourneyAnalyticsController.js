// backend/controllers/analytics/visitorJourneyAnalyticsController.js

import asyncHandler from "express-async-handler";

import Visitor from "../../models/Visitor.js";
import VisitorSession from "../../models/VisitorSession.js";
import PageView from "../../models/PageView.js";
import VisitorEvent from "../../models/VisitorEvent.js";

const PUBLIC_VISITOR_TYPES = [
  "guest",
  "user",
  "provider",
];

const getDateRange = ({
  range,
  startDate,
  endDate,
}) => {
  const now = new Date();

  let start = null;
  let end = null;

  switch (String(range || "7d").toLowerCase()) {
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
      end = new Date(endDate);

      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
      ) {
        return {
          error: "Invalid custom date range.",
        };
      }

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

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

const rate = (
  numerator,
  denominator
) => {
  if (
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

export const getVisitorJourneyAnalytics =
  asyncHandler(async (req, res) => {
    const {
      range = "7d",
      startDate,
      endDate,
    } = req.query;

    const resolvedRange =
      String(range || "7d").toLowerCase();

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

    const visitorFilter = {
      visitorType: {
        $in: PUBLIC_VISITOR_TYPES,
      },
    };

    const sessionFilter = {
      visitorType: {
        $in: PUBLIC_VISITOR_TYPES,
      },
    };

    const pageViewFilter = {
      visitorType: {
        $in: PUBLIC_VISITOR_TYPES,
      },
    };

    const eventFilter = {
      visitorType: {
        $in: PUBLIC_VISITOR_TYPES,
      },
    };

    if (start && end) {
      visitorFilter.createdAt = {
        $gte: start,
        $lte: end,
      };

      sessionFilter.createdAt = {
        $gte: start,
        $lte: end,
      };

      pageViewFilter.createdAt = {
        $gte: start,
        $lte: end,
      };

      eventFilter.createdAt = {
        $gte: start,
        $lte: end,
      };
    }

    const [
      totalVisitors,
      uniqueVisitors,
      totalSessions,
      totalPageViews,
      searchEvents,
      businessViews,
      calls,
      whatsapp,
      directions,
      websiteClicks,
    ] = await Promise.all([
      Visitor.countDocuments(
        visitorFilter
      ),

      Visitor.distinct(
        "_id",
        visitorFilter
      ),

      VisitorSession.countDocuments(
        sessionFilter
      ),

      PageView.countDocuments(
        pageViewFilter
      ),

      VisitorEvent.countDocuments({
        ...eventFilter,
        event: "search",
      }),

      VisitorEvent.countDocuments({
        ...eventFilter,
        event: "business_view",
      }),

      VisitorEvent.countDocuments({
        ...eventFilter,
        event: "call",
      }),

      VisitorEvent.countDocuments({
        ...eventFilter,
        event: "whatsapp",
      }),

      VisitorEvent.countDocuments({
        ...eventFilter,
        event: "directions",
      }),

      VisitorEvent.countDocuments({
        ...eventFilter,
        event: "website_click",
      }),
    ]);

    const visitorTypeBreakdown =
      await Visitor.aggregate([
        {
          $match: visitorFilter,
        },

        {
          $group: {
            _id: "$visitorType",
            count: {
              $sum: 1,
            },
          },
        },

        {
          $project: {
            _id: 0,
            type: "$_id",
            count: 1,
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]);

    const sessionTypeBreakdown =
      await VisitorSession.aggregate([
        {
          $match: sessionFilter,
        },

        {
          $group: {
            _id: "$visitorType",
            count: {
              $sum: 1,
            },
          },
        },

        {
          $project: {
            _id: 0,
            type: "$_id",
            count: 1,
          },
        },
      ]);

    const dailyTrend =
      await VisitorEvent.aggregate([
        {
          $match: eventFilter,
        },

        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },

            searches: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$event",
                      "search",
                    ],
                  },
                  1,
                  0,
                ],
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
          },
        },

        {
          $project: {
            _id: 0,
            date: "$_id",
            searches: 1,
            businessViews: 1,
            calls: 1,
            whatsapp: 1,
            directions: 1,
          },
        },

        {
          $sort: {
            date: 1,
          },
        },
      ]);

    const journey = {
      visitors: totalVisitors,
      sessions: totalSessions,
      pageViews: totalPageViews,
      searches: searchEvents,
      businessViews,
      calls,
      whatsapp,
      directions,
      websiteClicks,
    };

    return res.json({
      success: true,

      data: {
        range: resolvedRange,

        startDate:
          start?.toISOString() || null,

        endDate:
          end?.toISOString() || null,

        journey,

        conversion: {
          visitorToSessionRate: rate(
            totalSessions,
            uniqueVisitors.length
          ),

          sessionToPageViewRate: rate(
            totalPageViews,
            totalSessions
          ),

          pageViewToSearchRate: rate(
            searchEvents,
            totalPageViews
          ),

          searchToBusinessViewRate: rate(
            businessViews,
            searchEvents
          ),

          businessViewToCallRate: rate(
            calls,
            businessViews
          ),

          businessViewToWhatsappRate: rate(
            whatsapp,
            businessViews
          ),

          businessViewToDirectionsRate: rate(
            directions,
            businessViews
          ),
        },

        visitorTypes:
          visitorTypeBreakdown.map(
            (item) => ({
              type: item.type,
              visitors: item.count,
              percentage: rate(
                item.count,
                uniqueVisitors.length
              ),
            })
          ),

        sessionTypes:
          sessionTypeBreakdown,

        trend: dailyTrend,
      },

      meta: {
        generatedAt:
          new Date().toISOString(),

        includedVisitorTypes:
          PUBLIC_VISITOR_TYPES,

        excludedVisitorTypes: [
          "admin",
          "superadmin",
        ],
      },
    });
  });