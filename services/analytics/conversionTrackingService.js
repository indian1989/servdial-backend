// backend/services/analytics/conversionTrackingService.js
import VisitorEvent from "../../models/VisitorEvent.js";

import {
  trackEvent,
} from "./eventTrackingService.js";

/**
 * =========================================================
 * 🎯 CONVERSION TRACKING SERVICE
 * =========================================================
 *
 * RESPONSIBILITY:
 *
 * Track important ServDial conversion milestones.
 *
 * FUNNEL:
 *
 * Visitor
 *   ↓
 * Search
 *   ↓
 * Business / Listing
 *   ↓
 * Business Action
 *   ↓
 * Register
 *   ↓
 * Lead
 *   ↓
 * Provider
 *   ↓
 * Paid Service
 *
 * IMPORTANT:
 *
 * - This service does NOT replace VisitorEvent.
 * - Conversion milestones are also stored as VisitorEvent.
 * - Existing BusinessView / BusinessClick remain intact.
 * - Existing lead/payment/business logic is NOT changed here.
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
 * CONVERSION TYPES
 * =========================================================
 *
 * These are labels stored in VisitorEvent.eventLabel.
 *
 * We intentionally use existing event types so the
 * VisitorEvent enum does not need unnecessary changes.
 *
 * =========================================================
 */
export const CONVERSION_TYPES = {
  SEARCH: "search",

  BUSINESS_VIEW:
    "business_view",

  BUSINESS_ACTION:
    "business_action",

  REGISTER:
    "register",

  LEAD:
    "lead",

  PROVIDER:
    "provider",

  PAID_SERVICE:
    "paid_service",
};

/**
 * =========================================================
 * INTERNAL CONVERSION EVENT
 * =========================================================
 *
 * Generic helper.
 * =========================================================
 */
const trackConversion = async ({
  conversionType,

  visitorId,
  sessionId = null,
  user = null,

  path = "",
  pageViewId = null,

  business = null,
  category = null,
  city = null,

  query = "",

  metadata = {},

  source = "unknown",

  deviceType = "",
  browser = "",
  operatingSystem = "",

  country = "",
  state = "",
  cityName = "",
} = {}) => {
  const type =
    safeString(
      conversionType
    );

  if (!type) {
    return {
      success: false,
      event: null,
      message:
        "conversionType is required.",
    };
  }

  return trackEvent({
    visitorId,
    sessionId,
    user,

    event: "other",

    eventLabel:
      `conversion_${type}`,

    path,
    pageViewId,

    business,
    category,
    city,

    query,

    metadata: {
      ...safeObject(metadata),

      conversionType:
        type,

      conversion: true,
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
 * 1️⃣ VISITOR → SEARCH
 * =========================================================
 */
export const trackSearchConversion =
  async ({
    visitorId,
    sessionId = null,
    user = null,

    query = "",

    resultCount = 0,

    city = null,
    category = null,

    citySlug = "",
    categorySlug = "",

    path = "/search",
    pageViewId = null,

    metadata = {},

    source = "unknown",

    deviceType = "",
    browser = "",
    operatingSystem = "",

    country = "",
    state = "",
    cityName = "",
  } = {}) => {
    const normalizedQuery =
      safeString(query);

    if (!normalizedQuery) {
      return {
        success: false,
        event: null,
        message:
          "Search query is required.",
      };
    }

    return trackConversion({
      conversionType:
        CONVERSION_TYPES.SEARCH,

      visitorId,
      sessionId,
      user,

      path,
      pageViewId,

      city,
      category,

      query:
        normalizedQuery,

      metadata: {
        ...safeObject(metadata),

        resultCount:
          Math.max(
            0,
            Math.floor(
              safeNumber(
                resultCount,
                0
              )
            )
          ),

        citySlug:
          safeString(citySlug),

        categorySlug:
          safeString(
            categorySlug
          ),
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
 * 2️⃣ SEARCH → BUSINESS
 * =========================================================
 */
export const trackBusinessConversion =
  async ({
    visitorId,
    sessionId = null,
    user = null,

    business = null,

    query = "",

    resultPosition = null,

    city = null,
    category = null,

    path = "",
    pageViewId = null,

    metadata = {},

    source = "unknown",

    deviceType = "",
    browser = "",
    operatingSystem = "",

    country = "",
    state = "",
    cityName = "",
  } = {}) => {
    const position =
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

    return trackConversion({
      conversionType:
        CONVERSION_TYPES.BUSINESS_VIEW,

      visitorId,
      sessionId,
      user,

      path,
      pageViewId,

      business,
      category,
      city,

      query:
        safeString(query),

      metadata: {
        ...safeObject(metadata),

        resultPosition:
          position,
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
 * 3️⃣ BUSINESS → ACTION
 * =========================================================
 *
 * Action examples:
 *
 * call
 * whatsapp
 * directions
 * website_click
 * share
 * favorite
 *
 * =========================================================
 */
export const trackBusinessActionConversion =
  async ({
    visitorId,
    sessionId = null,
    user = null,

    business = null,

    action = "",

    query = "",

    city = null,
    category = null,

    path = "",
    pageViewId = null,

    metadata = {},

    source = "unknown",

    deviceType = "",
    browser = "",
    operatingSystem = "",

    country = "",
    state = "",
    cityName = "",
  } = {}) => {
    const normalizedAction =
      safeString(action)
        .toLowerCase()
        .replace(/\s+/g, "_");

    const allowedActions = [
      "call",
      "whatsapp",
      "directions",
      "website_click",
      "share",
      "favorite",
    ];

    if (
      !allowedActions.includes(
        normalizedAction
      )
    ) {
      return {
        success: false,
        event: null,
        message:
          "Invalid business conversion action.",
      };
    }

    return trackConversion({
      conversionType:
        CONVERSION_TYPES.BUSINESS_ACTION,

      visitorId,
      sessionId,
      user,

      path,
      pageViewId,

      business,
      category,
      city,

      query:
        safeString(query),

      metadata: {
        ...safeObject(metadata),

        action:
          normalizedAction,
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
 * 4️⃣ VISITOR → REGISTER
 * =========================================================
 */
export const trackRegistrationConversion =
  async ({
    visitorId,
    sessionId = null,
    user = null,

    registrationType = "user",

    path = "/register",
    pageViewId = null,

    metadata = {},

    source = "unknown",

    deviceType = "",
    browser = "",
    operatingSystem = "",

    country = "",
    state = "",
    cityName = "",
  } = {}) => {
    const normalizedType =
      safeString(
        registrationType
      ).toLowerCase() ||
      "user";

    return trackConversion({
      conversionType:
        CONVERSION_TYPES.REGISTER,

      visitorId,
      sessionId,
      user,

      path,
      pageViewId,

      metadata: {
        ...safeObject(metadata),

        registrationType:
          normalizedType,
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
 * 5️⃣ VISITOR → LEAD
 * =========================================================
 *
 * Lead creation remains controlled by the existing Lead
 * system. This function ONLY records the conversion.
 *
 * =========================================================
 */
export const trackLeadConversion =
  async ({
    visitorId,
    sessionId = null,
    user = null,

    business = null,

    leadId = null,

    leadType = "",
    leadSource = "",

    query = "",

    city = null,
    category = null,

    path = "",
    pageViewId = null,

    metadata = {},

    source = "unknown",

    deviceType = "",
    browser = "",
    operatingSystem = "",

    country = "",
    state = "",
    cityName = "",
  } = {}) => {
    return trackConversion({
      conversionType:
        CONVERSION_TYPES.LEAD,

      visitorId,
      sessionId,
      user,

      path,
      pageViewId,

      business,
      category,
      city,

      query:
        safeString(query),

      metadata: {
        ...safeObject(metadata),

        leadId:
          safeId(leadId),

        leadType:
          safeString(leadType),

        leadSource:
          safeString(leadSource),
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
 * 6️⃣ PROVIDER CONVERSION
 * =========================================================
 *
 * Tracks visitor/user reaching provider state.
 *
 * Actual account creation/update remains in the existing
 * authentication/provider system.
 *
 * =========================================================
 */
export const trackProviderConversion =
  async ({
    visitorId,
    sessionId = null,
    user = null,

    providerId = null,

    path = "",
    pageViewId = null,

    metadata = {},

    source = "unknown",

    deviceType = "",
    browser = "",
    operatingSystem = "",

    country = "",
    state = "",
    cityName = "",
  } = {}) => {
    return trackConversion({
      conversionType:
        CONVERSION_TYPES.PROVIDER,

      visitorId,
      sessionId,
      user,

      path,
      pageViewId,

      metadata: {
        ...safeObject(metadata),

        providerId:
          safeId(providerId),
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
 * 7️⃣ PROVIDER → PAID SERVICE
 * =========================================================
 *
 * This does NOT perform payment or subscription logic.
 *
 * It only records the conversion after the existing
 * payment/service layer confirms the action.
 *
 * =========================================================
 */
export const trackPaidServiceConversion =
  async ({
    visitorId,
    sessionId = null,
    user = null,

    providerId = null,

    serviceId = null,
    serviceType = "",

    amount = null,
    currency = "INR",

    paymentId = null,

    path = "",
    pageViewId = null,

    metadata = {},

    source = "unknown",

    deviceType = "",
    browser = "",
    operatingSystem = "",

    country = "",
    state = "",
    cityName = "",
  } = {}) => {
    const normalizedAmount =
      amount === null ||
      amount === undefined
        ? null
        : Math.max(
            0,
            safeNumber(
              amount,
              0
            )
          );

    return trackConversion({
      conversionType:
        CONVERSION_TYPES.PAID_SERVICE,

      visitorId,
      sessionId,
      user,

      path,
      pageViewId,

      metadata: {
        ...safeObject(metadata),

        providerId:
          safeId(providerId),

        serviceId:
          safeId(serviceId),

        serviceType:
          safeString(serviceType),

        amount:
          normalizedAmount,

        currency:
          safeString(currency) ||
          "INR",

        paymentId:
          safeId(paymentId),
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
 * CONVERSION FUNNEL EVENTS
 * =========================================================
 *
 * Returns conversion events for a visitor/session.
 *
 * Useful later for admin funnel analytics.
 *
 * =========================================================
 */
export const getConversionEvents =
  async ({
    visitorId = null,
    sessionId = null,

    startDate = null,
    endDate = null,

    limit = 100,
  } = {}) => {
    const query = {
      event: "other",

      eventLabel: {
        $regex:
          /^conversion_/,
      },
    };

    if (safeString(visitorId)) {
      query.visitorId =
        safeString(visitorId);
    }

    if (safeString(sessionId)) {
      query.sessionId =
        safeString(sessionId);
    }

    if (
      startDate ||
      endDate
    ) {
      query.occurredAt = {};

      if (startDate) {
        const start =
          new Date(startDate);

        if (
          !Number.isNaN(
            start.getTime()
          )
        ) {
          query.occurredAt.$gte =
            start;
        }
      }

      if (endDate) {
        const end =
          new Date(endDate);

        if (
          !Number.isNaN(
            end.getTime()
          )
        ) {
          query.occurredAt.$lte =
            end;
        }
      }

      if (
        Object.keys(
          query.occurredAt
        ).length === 0
      ) {
        delete query.occurredAt;
      }
    }

    const safeLimit =
      Math.min(
        500,
        Math.max(
          1,
          Math.floor(
            safeNumber(
              limit,
              100
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

/**
 * =========================================================
 * FUNNEL SUMMARY
 * =========================================================
 *
 * Produces counts for conversion milestones.
 *
 * NOTE:
 *
 * This is event-count based, not unique-visitor based.
 * A future admin funnel service can calculate unique
 * visitor conversion rates using visitorId.
 *
 * =========================================================
 */
export const getConversionSummary =
  async ({
    startDate = null,
    endDate = null,
  } = {}) => {
    const match = {
      event: "other",

      eventLabel: {
        $regex:
          /^conversion_/,
      },
    };

    if (
      startDate ||
      endDate
    ) {
      match.occurredAt = {};

      if (startDate) {
        const start =
          new Date(startDate);

        if (
          !Number.isNaN(
            start.getTime()
          )
        ) {
          match.occurredAt.$gte =
            start;
        }
      }

      if (endDate) {
        const end =
          new Date(endDate);

        if (
          !Number.isNaN(
            end.getTime()
          )
        ) {
          match.occurredAt.$lte =
            end;
        }
      }

      if (
        Object.keys(
          match.occurredAt
        ).length === 0
      ) {
        delete match.occurredAt;
      }
    }

    return VisitorEvent.aggregate([
      {
        $match: match,
      },

      {
        $group: {
          _id:
            "$eventLabel",

          count: {
            $sum: 1,
          },

          visitors: {
            $addToSet:
              "$visitorId",
          },
        },
      },

      {
        $project: {
          _id: 0,

          conversion:
            "$_id",

          count: 1,

          uniqueVisitors: {
            $size:
              "$visitors",
          },
        },
      },

      {
        $sort: {
          count: -1,
        },
      },
    ]);
  };

/**
 * ---------------------------------------------------------
 * SAFE ID
 * ---------------------------------------------------------
 */
function safeId(value = null) {
  const id =
    safeString(value);

  return id || null;
}