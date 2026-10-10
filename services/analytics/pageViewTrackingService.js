// backend/services/analytics/pageViewTrackingService.js
import PageView from "../../models/PageView.js";
import Visitor from "../../models/Visitor.js";
import VisitorSession from "../../models/VisitorSession.js";

import {
  trackSession,
  incrementSessionPageViews,
} from "./sessionTrackingService.js";

import {
  normalizeSource,
  normalizeReferrer,
  getReferrerDomain,
  isInternalReferrer,
  detectDeviceType,
  detectBrowser,
  detectOperatingSystem,
} from "./visitorTrackingService.js";
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
 * RESOLVE PAGE VIEW ACQUISITION
 * =========================================================
 *
 * Priority:
 *
 * 1. Explicit incoming acquisition data
 * 2. Active session acquisition data
 * 3. Visitor first-touch acquisition data
 *
 * Internal ServDial referrers are never treated as
 * external acquisition.
 *
 * =========================================================
 */

const resolvePageViewAcquisition = ({
  source = "",
  referrer = "",

  utmSource = "",
  utmMedium = "",
  utmCampaign = "",
  utmTerm = "",
  utmContent = "",

  session = null,
  visitor = null,
} = {}) => {
  const incomingReferrer =
    normalizeReferrer(referrer);

  const sessionReferrer =
    normalizeReferrer(session?.referrer || "");

  const visitorReferrer =
    normalizeReferrer(visitor?.referrer || "");

  // Ignore internal referrers BEFORE choosing the
  // acquisition referrer. Otherwise localhost/ServDial
  // can mask a genuine external referrer.
  const externalCandidates = [
    incomingReferrer,
    sessionReferrer,
    visitorReferrer,
  ].filter(
    (value) =>
      value && !isInternalReferrer(value)
  );

  const externalReferrer =
    externalCandidates[0] || "";

  // Preserve first-touch UTM information when the current
  // page does not contain new UTM parameters.
  const resolvedUtmSource =
    safeString(utmSource) ||
    safeString(session?.utmSource) ||
    safeString(visitor?.utmSource);

  const resolvedUtmMedium =
    safeString(utmMedium) ||
    safeString(session?.utmMedium) ||
    safeString(visitor?.utmMedium);

  const resolvedUtmCampaign =
    safeString(utmCampaign) ||
    safeString(session?.utmCampaign) ||
    safeString(visitor?.utmCampaign);

  const resolvedUtmTerm =
    safeString(utmTerm) ||
    safeString(session?.utmTerm) ||
    safeString(visitor?.utmTerm);

  const resolvedUtmContent =
    safeString(utmContent) ||
    safeString(session?.utmContent) ||
    safeString(visitor?.utmContent);

  const normalizedMedium =
    resolvedUtmMedium.toLowerCase().trim();

  const hasUtm = Boolean(
    resolvedUtmSource ||
    resolvedUtmMedium ||
    resolvedUtmCampaign ||
    resolvedUtmTerm ||
    resolvedUtmContent
  );

  // Prefer a meaningful existing session source over an
  // incoming "direct"/"unknown" value on later page views.
  const incomingSource =
    normalizeSource(source);

  const sessionSource =
    normalizeSource(session?.source);

  const visitorSource =
    normalizeSource(visitor?.source);

  let resolvedSource =
    incomingSource;

  const hasMeaningfulSource = (value) =>
    Boolean(value) &&
    !["direct", "unknown"].includes(value);

  if (
    !hasMeaningfulSource(resolvedSource) &&
    hasMeaningfulSource(sessionSource)
  ) {
    resolvedSource = sessionSource;
  }

  if (
    !hasMeaningfulSource(resolvedSource) &&
    hasMeaningfulSource(visitorSource)
  ) {
    resolvedSource = visitorSource;
  }

  // UTM campaign attribution takes priority.
  if (hasUtm) {
    if (
      [
        "cpc",
        "ppc",
        "paid_search",
        "paidsearch",
        "sem",
      ].includes(normalizedMedium)
    ) {
      resolvedSource = "paid_search";
    } else if (
      [
        "paid_social",
        "paidsocial",
        "social_paid",
      ].includes(normalizedMedium)
    ) {
      resolvedSource = "paid_social";
    } else if (
      [
        "email",
        "e-mail",
        "newsletter",
      ].includes(normalizedMedium)
    ) {
      resolvedSource = "email";
    
    } else if (
      [
        "display",
        "banner",
        "programmatic",
      ].includes(normalizedMedium)
    ) {
      resolvedSource = "display";
    } else if (
      ["organic", "seo"].includes(normalizedMedium)
    ) {
      resolvedSource = "organic";
    } else if (
      [
        "social",
        "social-media",
        "social_media",
      ].includes(normalizedMedium)
    ) {
      resolvedSource = "social";
    } else if (
      ["referral", "refer"].includes(normalizedMedium)
    ) {
      resolvedSource = "referral";
    } else {
      resolvedSource = "campaign";
    }
  } else if (externalReferrer) {
    // Classify the external domain when there is no UTM.
    const domain =
      getReferrerDomain(externalReferrer)
        .toLowerCase()
        .replace(/^www\./, "");

    if (
      /(^|\.)google\./i.test(domain) ||
      /(^|\.)bing\.com$/i.test(domain) ||
      /(^|\.)search\.yahoo\.com$/i.test(domain) ||
      /(^|\.)duckduckgo\.com$/i.test(domain) ||
      /(^|\.)yandex\./i.test(domain) ||
      /(^|\.)baidu\.com$/i.test(domain)
    ) {
      resolvedSource = "organic";
    } else if (
      /(^|\.)facebook\.com$/i.test(domain) ||
      /(^|\.)fb\.com$/i.test(domain) ||
      /(^|\.)instagram\.com$/i.test(domain) ||
      /(^|\.)whatsapp\.com$/i.test(domain) ||
      /(^|\.)whatsapp\.net$/i.test(domain) ||
      /(^|\.)linkedin\.com$/i.test(domain) ||
      /(^|\.)twitter\.com$/i.test(domain) ||
      /(^|\.)x\.com$/i.test(domain) ||
      /(^|\.)t\.co$/i.test(domain) ||
      /(^|\.)youtube\.com$/i.test(domain) ||
      /(^|\.)youtu\.be$/i.test(domain) ||
      /(^|\.)tiktok\.com$/i.test(domain) ||
      /(^|\.)pinterest\.com$/i.test(domain) ||
      /(^|\.)reddit\.com$/i.test(domain) ||
      /(^|\.)telegram\.org$/i.test(domain) ||
      /(^|\.)t\.me$/i.test(domain)
    ) {
      resolvedSource = "social";
    } else {
      resolvedSource = "referral";
    }
  }

  return {
    source: resolvedSource || "unknown",

    referrer: externalReferrer,

    referrerDomain:
      getReferrerDomain(externalReferrer),

    utmSource: resolvedUtmSource,
    utmMedium: resolvedUtmMedium,
    utmCampaign: resolvedUtmCampaign,
    utmTerm: resolvedUtmTerm,
    utmContent: resolvedUtmContent,
  };
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

  const acquisition =
    resolvePageViewAcquisition({
      source,
      referrer,

      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,

      session,
      visitor,
    });

  const resolvedUserAgent =
    safeString(
      visitor?.userAgent ||
      session?.userAgent ||
      ""
    );

  const resolvedDeviceType =
    safeString(deviceType) ||
    session?.deviceType ||
    visitor?.deviceType ||
    (
      resolvedUserAgent
        ? detectDeviceType(
            resolvedUserAgent
          )
        : "unknown"
    );

  const resolvedBrowser =
    safeString(browser) ||
    session?.browser ||
    visitor?.browser ||
    (
      resolvedUserAgent
        ? detectBrowser(
            resolvedUserAgent
          )
        : ""
    );

  const resolvedOperatingSystem =
    safeString(
      operatingSystem
    ) ||
    session?.operatingSystem ||
    visitor?.operatingSystem ||
    (
      resolvedUserAgent
        ? detectOperatingSystem(
            resolvedUserAgent
          )
        : ""
    );

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
      acquisition.referrer,

    referrerDomain:
      acquisition.referrerDomain,

    source:
      acquisition.source,

    utmSource:
      acquisition.utmSource,

    utmMedium:
      acquisition.utmMedium,

    utmCampaign:
      acquisition.utmCampaign,

    utmTerm:
      acquisition.utmTerm,

    utmContent:
      acquisition.utmContent,

    deviceType:
      resolvedDeviceType,

    browser:
      resolvedBrowser,

    operatingSystem:
      resolvedOperatingSystem,

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
  userAgent = "",

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
        userAgent,

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

        deviceType:
          safeString(deviceType),

        browser:
          safeString(browser),

        operatingSystem:
          safeString(operatingSystem),

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