// backend/services/analytics/eventTrackingService.js
import VisitorEvent from "../../models/VisitorEvent.js";
import Visitor from "../../models/Visitor.js";
import VisitorSession from "../../models/VisitorSession.js";
import PageView from "../../models/PageView.js";

import {
  trackSession,
  incrementSessionEvents,
} from "./sessionTrackingService.js";

/**
 * =========================================================
 * ⚡ EVENT TRACKING SERVICE
 * =========================================================
 *
 * RESPONSIBILITY:
 *
 * Visitor
 *   ↓
 * Session
 *   ↓
 * Page View
 *   ↓
 * Event
 *
 * CAPTURE:
 *
 * - business_view
 * - search
 * - call
 * - whatsapp
 * - directions
 * - website_click
 * - category_view
 * - city_view
 * - share
 * - login
 * - register
 * - logout
 * - business_click
 * - listing_click
 * - filter
 * - favorite
 * - other
 *
 * IMPORTANT:
 *
 * - This is the platform-wide behavioral event stream.
 * - Existing BusinessView / BusinessClick remain separate.
 * - Do NOT increment Business.views here.
 * - Do NOT use IP as visitor identity.
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
 * SAFE ID
 * ---------------------------------------------------------
 */
const safeId = (value = null) => {
  const id = safeString(value);

  return id || null;
};

/**
 * =========================================================
 * ALLOWED EVENTS
 * =========================================================
 */
export const TRACKABLE_EVENTS = [
  "business_view",
  "search",
  "call",
  "whatsapp",
  "directions",
  "website_click",
  "category_view",
  "city_view",
  "share",
  "login",
  "register",
  "logout",
  "business_click",
  "listing_click",
  "filter",
  "favorite",
  "other",
];

/**
 * =========================================================
 * EVENT NORMALIZATION
 * =========================================================
 */
export const normalizeEventName = (
  event = ""
) => {
  const normalized =
    safeString(event)
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/-/g, "_");

  if (
    TRACKABLE_EVENTS.includes(
      normalized
    )
  ) {
    return normalized;
  }

  return "other";
};

/**
 * =========================================================
 * BUILD EVENT DATA
 * =========================================================
 */
const buildEventData = ({
  visitor,
  session,
  pageView = null,

  user = null,

  event,
  eventLabel = "",

  path = "",

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
}) => {
  const visitorType =
    user?.role === "provider"
      ? "provider"
      : user
      ? "user"
      : session?.visitorType ||
        visitor?.visitorType ||
        "guest";

  return {
    visitorId:
      visitor.visitorId,

    sessionId:
      session.sessionId,

    visitor:
      visitor._id,

    session:
      session._id,

    pageView:
      pageView?._id || null,

    visitorType,

    user:
      user?._id ||
      visitor.user ||
      null,

    event:
      normalizeEventName(event),

    eventLabel:
      safeString(eventLabel),

    path:
      safeString(path),

    business:
      safeId(business),

    category:
      safeId(category),

    city:
      safeId(city),

    query:
      safeString(query),

    metadata:
      metadata &&
      typeof metadata === "object"
        ? metadata
        : {},

    source:
      safeString(source) ||
      session.source ||
      visitor.source ||
      "unknown",

    deviceType:
      safeString(deviceType) ||
      session.deviceType ||
      visitor.deviceType ||
      "unknown",

    browser:
      safeString(browser) ||
      session.browser ||
      visitor.browser ||
      "",

    operatingSystem:
      safeString(
        operatingSystem
      ) ||
      session.operatingSystem ||
      visitor.operatingSystem ||
      "",

    country:
      safeString(country) ||
      session.country ||
      visitor.country ||
      "",

    state:
      safeString(state) ||
      session.state ||
      visitor.state ||
      "",

    cityName:
      safeString(cityName) ||
      session.city ||
      visitor.city ||
      "",

    occurredAt:
      new Date(),
  };
};

/**
 * =========================================================
 * RESOLVE PAGE VIEW
 * =========================================================
 */
const resolvePageView = async ({
  pageViewId,
  visitorId,
  sessionId,
}) => {
  const id =
    safeString(pageViewId);

  if (id) {
    const pageView =
      await PageView.findOne({
        _id: id,
        visitorId,
        sessionId,
      });

    if (pageView) {
      return pageView;
    }
  }

  /**
   * If frontend did not send pageViewId,
   * use the latest page view from the session.
   */
  if (sessionId) {
    return PageView.findOne({
      visitorId,
      sessionId,
    }).sort({
      viewedAt: -1,
    });
  }

  return null;
};

/**
 * =========================================================
 * TRACK EVENT
 * =========================================================
 */
export const trackEvent = async ({
  visitorId,
  sessionId = null,

  user = null,

  event,
  eventLabel = "",

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

  entryPage = "",
  landingPage = "",
} = {}) => {

  /**
   * -------------------------------------------------------
   * ADMIN / SUPERADMIN EXCLUSION
   * -------------------------------------------------------
   */
  if (
    user?.role === "admin" ||
    user?.role === "superadmin"
  ) {
    return {
      success: false,
      excluded: true,
      event: null,
      session: null,
      visitor: null,
      message:
        "Admin visitors are excluded from visitor analytics.",
    };
  }

  const resolvedVisitorId =
    safeString(visitorId);

  /**
   * -------------------------------------------------------
   * VALIDATION
   * -------------------------------------------------------
   */
  if (!resolvedVisitorId) {
    return {
      success: false,
      event: null,
      session: null,
      visitor: null,
      message:
        "visitorId is required for event tracking.",
    };
  }

  const normalizedEvent =
    normalizeEventName(event);

  /**
   * -------------------------------------------------------
   * FIND VISITOR
   * -------------------------------------------------------
   */
  const visitor =
    await Visitor.findOne({
      visitorId:
        resolvedVisitorId,
    });

  if (!visitor) {
    return {
      success: false,
      event: null,
      session: null,
      visitor: null,
      message:
        "Visitor was not found.",
    };
  }

  /**
   * -------------------------------------------------------
   * RESOLVE SESSION
   * -------------------------------------------------------
   */
  let session = null;

  if (safeString(sessionId)) {
    session =
      await VisitorSession.findOne({
        sessionId:
          safeString(sessionId),

        visitorId:
          resolvedVisitorId,

        isActive: true,
      });
  }

  /**
   * -------------------------------------------------------
   * CREATE / REUSE SESSION
   * -------------------------------------------------------
   */
  if (!session) {
    const sessionResult =
      await trackSession({
        visitorId:
          resolvedVisitorId,

        user,

        entryPage:
          safeString(entryPage) ||
          safeString(path),

        landingPage:
          safeString(landingPage) ||
          safeString(path),

        deviceType,
        browser,
        operatingSystem,

        country,
        state,
        city: cityName,

        source,

        utmSource:
          metadata?.utmSource || "",

        utmMedium:
          metadata?.utmMedium || "",

        utmCampaign:
          metadata?.utmCampaign || "",

        utmTerm:
          metadata?.utmTerm || "",

        utmContent:
          metadata?.utmContent || "",

        referrer:
          metadata?.referrer || "",
      });

    if (
      !sessionResult?.success ||
      !sessionResult?.session
    ) {
      return {
        success: false,
        event: null,
        session: null,
        visitor,
        message:
          sessionResult?.message ||
          "Unable to create or resolve visitor session.",
      };
    }

    session =
      sessionResult.session;
  }

  /**
   * -------------------------------------------------------
   * RESOLVE CURRENT PAGE VIEW
   * -------------------------------------------------------
   */
  const pageView =
    await resolvePageView({
      pageViewId,
      visitorId:
        resolvedVisitorId,
      sessionId:
        session.sessionId,
    });

  /**
   * -------------------------------------------------------
   * UPDATE VISITOR
   * -------------------------------------------------------
   */
  visitor.lastSeenAt =
    new Date();

  visitor.isActive = true;

  if (user?._id) {
    visitor.user =
      user._id;

    visitor.visitorType =
      user.role === "provider"
        ? "provider"
        : "user";
  }

  await visitor.save();

  /**
   * -------------------------------------------------------
   * CREATE EVENT
   * -------------------------------------------------------
   */
  const visitorEvent =
    await VisitorEvent.create(
      buildEventData({
        visitor,
        session,
        pageView,

        user,

        event:
          normalizedEvent,

        eventLabel,

        path:
          safeString(path) ||
          pageView?.path ||
          "",

        business,
        category,
        city,

        query,

        metadata,

        source,

        deviceType,
        browser,
        operatingSystem,

        country,
        state,
        cityName,
      })
    );

  /**
   * -------------------------------------------------------
   * UPDATE SESSION EVENT COUNT
   * -------------------------------------------------------
   */
  const updatedSession =
    await incrementSessionEvents(
      session.sessionId
    );

  /**
   * -------------------------------------------------------
   * RETURN TRACKING CONTEXT
   * -------------------------------------------------------
   */
  return {
    success: true,

    event:
      visitorEvent,

    session:
      updatedSession ||
      session,

    visitor,

    pageView,

    visitorId:
      visitor.visitorId,

    sessionId:
      session.sessionId,

    visitorType:
      visitorEvent.visitorType,
  };
};

/**
 * =========================================================
 * BUSINESS ACTION EVENT
 * =========================================================
 *
 * Convenience helper for:
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
export const trackBusinessAction = async ({
  action,

  visitorId,
  sessionId = null,
  user = null,

  business = null,

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
    normalizeEventName(action);

  const allowedBusinessActions = [
    "call",
    "whatsapp",
    "directions",
    "website_click",
    "share",
    "favorite",
  ];

  if (
    !allowedBusinessActions.includes(
      normalizedAction
    )
  ) {
    return {
      success: false,
      event: null,
      session: null,
      visitor: null,
      message:
        "Invalid business action event.",
    };
  }

  return trackEvent({
    visitorId,
    sessionId,
    user,

    event:
      normalizedAction,

    path,
    pageViewId,

    business,

    metadata,

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
 * SEARCH EVENT
 * =========================================================
 */
export const trackSearchEvent =
  async ({
    visitorId,
    sessionId = null,
    user = null,

    query = "",

    path = "/search",
    pageViewId = null,

    category = null,
    city = null,

    resultCount = null,

    metadata = {},

    source = "unknown",

    deviceType = "",
    browser = "",
    operatingSystem = "",

    country = "",
    state = "",
    cityName = "",
  } = {}) => {
    const searchMetadata = {
      ...(metadata &&
      typeof metadata === "object"
        ? metadata
        : {}),

      resultCount:
        resultCount === null
          ? null
          : Number(resultCount) || 0,
    };

    return trackEvent({
      visitorId,
      sessionId,
      user,

      event: "search",

      eventLabel:
        safeString(query),

      path,
      pageViewId,

      category,
      city,

      query,

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
 * =========================================================
 * AUTH EVENT
 * =========================================================
 */
export const trackAuthEvent =
  async ({
    event,

    visitorId,
    sessionId = null,
    user = null,

    path = "",

    metadata = {},

    source = "unknown",

    deviceType = "",
    browser = "",
    operatingSystem = "",

    country = "",
    state = "",
    cityName = "",
  } = {}) => {
    const normalizedEvent =
      normalizeEventName(event);

    const allowedAuthEvents = [
      "login",
      "register",
      "logout",
    ];

    if (
      !allowedAuthEvents.includes(
        normalizedEvent
      )
    ) {
      return {
        success: false,
        event: null,
        session: null,
        visitor: null,
        message:
          "Invalid authentication event.",
      };
    }

    return trackEvent({
      visitorId,
      sessionId,
      user,

      event:
        normalizedEvent,

      path,

      metadata,

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
 * GET EVENT BY ID
 * =========================================================
 */
export const getEventById =
  async (eventId) => {
    const id =
      safeString(eventId);

    if (!id) {
      return null;
    }

    return VisitorEvent.findById(id);
  };

/**
 * =========================================================
 * GET SESSION EVENTS
 * =========================================================
 */
export const getSessionEvents =
  async (sessionId) => {
    const id =
      safeString(sessionId);

    if (!id) {
      return [];
    }

    return VisitorEvent.find({
      sessionId: id,
    }).sort({
      occurredAt: 1,
    });
  };