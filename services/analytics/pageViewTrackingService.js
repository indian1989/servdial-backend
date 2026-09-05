// backend/services/analytics/pageViewTrackingService.js
import PageView from "../../models/PageView.js";
import Visitor from "../../models/Visitor.js";
import VisitorSession from "../../models/VisitorSession.js";

import {
  trackSession,
  incrementSessionPageViews,
} from "./sessionTrackingService.js";

/**
 * =========================================================
 * 📄 PAGE VIEW TRACKING SERVICE
 * =========================================================
 *
 * RESPONSIBILITY:
 *
 * Visitor
 *   ↓
 * Session
 *   ↓
 * Page View
 *
 * - Create page-view record
 * - Ensure visitor exists
 * - Ensure active session exists
 * - Associate user/provider
 * - Detect page type
 * - Store business/category/city context
 * - Update session pageViews
 * - Update visitor lastSeenAt
 *
 * IMPORTANT:
 *
 * - PageView = platform page visit
 * - BusinessView = existing business-specific analytics
 * - Do NOT replace BusinessView with PageView
 * - Do NOT increment Business.views here
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
 * SAFE OBJECT ID
 * ---------------------------------------------------------
 *
 * Mongoose accepts ObjectId strings, but empty strings
 * should always become null.
 *
 * ---------------------------------------------------------
 */
const safeId = (value = null) => {
  const id = safeString(value);

  return id || null;
};

/**
 * =========================================================
 * PAGE TYPE DETECTION
 * =========================================================
 */
export const detectPageType = (
  path = "",
  pageType = ""
) => {
  const explicitType =
    safeString(pageType).toLowerCase();

  const allowedTypes = [
    "home",
    "search",
    "business",
    "category",
    "city",
    "listing",
    "auth",
    "admin",
    "other",
  ];

  if (
    allowedTypes.includes(
      explicitType
    )
  ) {
    return explicitType;
  }

  const cleanPath =
    safeString(path)
      .split("?")[0]
      .toLowerCase();

  if (
    cleanPath === "/" ||
    cleanPath === ""
  ) {
    return "home";
  }

  if (
    cleanPath === "/search" ||
    cleanPath.startsWith(
      "/search/"
    )
  ) {
    return "search";
  }

  if (
    cleanPath.includes(
      "/business/"
    ) ||
    cleanPath.includes(
      "/businesses/"
    )
  ) {
    return "business";
  }

  if (
    cleanPath.includes(
      "/category/"
    ) ||
    cleanPath.includes(
      "/categories/"
    )
  ) {
    return "category";
  }

  if (
    cleanPath.includes(
      "/city/"
    ) ||
    cleanPath.includes(
      "/cities/"
    )
  ) {
    return "city";
  }

  if (
    cleanPath.includes(
      "/login"
    ) ||
    cleanPath.includes(
      "/register"
    ) ||
    cleanPath.includes(
      "/forgot-password"
    )
  ) {
    return "auth";
  }

  if (
    cleanPath.startsWith(
      "/admin"
    )
  ) {
    return "admin";
  }

  return "other";
};

/**
 * =========================================================
 * BUILD PAGE VIEW DATA
 * =========================================================
 */
const buildPageViewData = ({
  visitor,
  session,

  user = null,

  path,
  pageTitle = "",
  pageType = "",

  business = null,
  category = null,
  city = null,

  query = "",

  referrer = "",
  source = "",

  utmSource = "",
  utmMedium = "",
  utmCampaign = "",
  utmTerm = "",
  utmContent = "",

  deviceType = "",
  browser = "",
  operatingSystem = "",

  country = "",
  state = "",
  cityName = "",

  durationSeconds = 0,
}) => {
  const resolvedPageType =
    detectPageType(
      path,
      pageType
    );

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

    visitorType,

    user:
      user?._id ||
      visitor.user ||
      null,

    path:
      safeString(path),

    pageTitle:
      safeString(pageTitle),

    pageType:
      resolvedPageType,

    business:
      safeId(business),

    category:
      safeId(category),

    city:
      safeId(city),

    query:
      safeString(query),

    referrer:
      safeString(referrer) ||
      session.referrer ||
      visitor.referrer ||
      "",

    source:
      safeString(source) ||
      session.source ||
      visitor.source ||
      "unknown",

    utmSource:
      safeString(utmSource),

    utmMedium:
      safeString(utmMedium),

    utmCampaign:
      safeString(utmCampaign),

    utmTerm:
      safeString(utmTerm),

    utmContent:
      safeString(utmContent),

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

    durationSeconds:
      Math.max(
        0,
        Number(durationSeconds) || 0
      ),

    viewedAt:
      new Date(),
  };
};

/**
 =========================================================
 * TRACK PAGE VIEW
 =========================================================
 */
export const trackPageView = async ({
  visitorId,
  sessionId = null,

  user = null,

  path = "",
  pageTitle = "",
  pageType = "",

  business = null,
  category = null,
  city = null,

  query = "",

  referrer = "",
  source = "",

  utmSource = "",
  utmMedium = "",
  utmCampaign = "",
  utmTerm = "",
  utmContent = "",

  deviceType = "",
  browser = "",
  operatingSystem = "",

  country = "",
  state = "",
  cityName = "",

  durationSeconds = 0,

  entryPage = "",
  landingPage = "",
} = {}) => {
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
      pageView: null,
      session: null,
      visitor: null,
      message:
        "visitorId is required for page-view tracking.",
    };
  }

  if (!safeString(path)) {
    return {
      success: false,
      pageView: null,
      session: null,
      visitor: null,
      message:
        "path is required for page-view tracking.",
    };
  }

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
      pageView: null,
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
   *
   * If frontend already knows sessionId, use it only if
   * that session belongs to the same visitor and is active.
   *
   * Otherwise sessionTrackingService creates/reuses the
   * correct session.
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
        referrer,

        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
      });

    if (
      !sessionResult?.success ||
      !sessionResult?.session
    ) {
      return {
        success: false,
        pageView: null,
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
   * UPDATE VISITOR ACTIVITY
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
   * CREATE PAGE VIEW
   * -------------------------------------------------------
   */
  const pageView =
    await PageView.create(
      buildPageViewData({
        visitor,
        session,

        user,

        path,
        pageTitle,
        pageType,

        business,
        category,
        city,

        query,

        referrer,
        source,

        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,

        deviceType,
        browser,
        operatingSystem,

        country,
        state,
        cityName,

        durationSeconds,
      })
    );

  /**
   * -------------------------------------------------------
   * UPDATE SESSION PAGE VIEW COUNT
   * -------------------------------------------------------
   */
  const updatedSession =
    await incrementSessionPageViews(
      session.sessionId
    );

  /**
   * -------------------------------------------------------
   * RETURN TRACKING CONTEXT
   * -------------------------------------------------------
   */
  return {
    success: true,

    pageView,

    session:
      updatedSession ||
      session,

    visitor,

    visitorId:
      visitor.visitorId,

    sessionId:
      session.sessionId,

    visitorType:
      pageView.visitorType,

    pageType:
      pageView.pageType,
  };
};

/**
 * =========================================================
 * UPDATE PAGE VIEW DURATION
 * =========================================================
 *
 * Called later when the user leaves the page or when the
 * frontend sends a duration heartbeat.
 *
 * =========================================================
 */
export const updatePageViewDuration =
  async (
    pageViewId,
    durationSeconds
  ) => {
    const id =
      safeString(pageViewId);

    if (!id) {
      return null;
    }

    const duration =
      Math.max(
        0,
        Number(durationSeconds) || 0
      );

    return PageView.findByIdAndUpdate(
      id,
      {
        $set: {
          durationSeconds:
            duration,
        },
      },
      {
        new: true,
      }
    );
  };

/**
 * =========================================================
 * GET PAGE VIEW
 * =========================================================
 */
export const getPageViewById =
  async (pageViewId) => {
    const id =
      safeString(pageViewId);

    if (!id) {
      return null;
    }

    return PageView.findById(id);
  };

/**
 * =========================================================
 * GET SESSION PAGE VIEWS
 * =========================================================
 */
export const getSessionPageViews =
  async (sessionId) => {
    const id =
      safeString(sessionId);

    if (!id) {
      return [];
    }

    return PageView.find({
      sessionId: id,
    }).sort({
      viewedAt: 1,
    });
  };