// backend/services/analytics/sessionTrackingService.js
import VisitorSession from "../../models/VisitorSession.js";
import Visitor from "../../models/Visitor.js";

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
 * 🔄 SESSION TRACKING SERVICE
 * =========================================================
 *
 * RESPONSIBILITY:
 *
 * Visitor
 *   ↓
 * Session
 *   ↓
 * Page Views
 *   ↓
 * Events
 *
 * - Create visitor session
 * - Reuse active session
 * - Detect session timeout
 * - Update lastActivityAt
 * - Update session counters
 * - Associate authenticated user/provider
 *
 * IMPORTANT:
 *
 * - sessionId is NOT visitorId
 * - visitorId identifies the visitor
 * - sessionId identifies one visit/session
 * - IP is NOT used as identity
 *
 * =========================================================
 */

/**
 * ---------------------------------------------------------
 * DEFAULT SESSION TIMEOUT
 * ---------------------------------------------------------
 *
 * 30 minutes of inactivity = new session.
 *
 * This is a standard analytics-style session window.
 *
 * ---------------------------------------------------------
 */
const SESSION_TIMEOUT_MINUTES = 30;

const SESSION_TIMEOUT_MS =
  SESSION_TIMEOUT_MINUTES * 60 * 1000;

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
 * RESOLVE SESSION ACQUISITION
 * ---------------------------------------------------------
 *
 * Session-level acquisition should represent the source
 * responsible for starting the session.
 *
 * Priority:
 *
 * 1. Explicit UTM/source/referrer
 * 2. External referrer
 * 3. Direct
 * 4. Unknown
 *
 * Internal ServDial referrers are ignored.
 *
 * ---------------------------------------------------------
 */
const resolveSessionAcquisition = ({
  source = "",
  referrer = "",
  utmSource = "",
  utmMedium = "",
  utmCampaign = "",
  utmTerm = "",
  utmContent = "",
} = {}) => {
  const normalizedUtmSource =
    safeString(utmSource).toLowerCase();

  const normalizedUtmMedium =
    safeString(utmMedium).toLowerCase();

  const normalizedUtmCampaign =
    safeString(utmCampaign);

  const normalizedUtmTerm =
    safeString(utmTerm);

  const normalizedUtmContent =
    safeString(utmContent);

  let normalizedReferrer =
    normalizeReferrer(referrer);

  if (
    normalizedReferrer &&
    isInternalReferrer(normalizedReferrer)
  ) {
    normalizedReferrer = "";
  }

  let normalizedSource =
    normalizeSource(source);

  /**
   * -------------------------------------------------------
   * UTM-based acquisition
   * -------------------------------------------------------
   */
  if (
    normalizedUtmSource ||
    normalizedUtmMedium ||
    normalizedUtmCampaign
  ) {
    if (
      [
        "cpc",
        "ppc",
        "paid_search",
        "paidsearch",
        "sem",
      ].includes(normalizedUtmMedium)
    ) {
      normalizedSource = "paid_search";
    } else if (
      [
        "paid_social",
        "paidsocial",
        "social_paid",
      ].includes(normalizedUtmMedium)
    ) {
      normalizedSource = "paid_social";
    } else if (
      [
        "email",
        "e-mail",
        "newsletter",
      ].includes(normalizedUtmMedium)
    ) {
      normalizedSource = "email";
    } else if (
      [
        "display",
        "banner",
        "programmatic",
      ].includes(normalizedUtmMedium)
    ) {
      normalizedSource = "display";
    } else {
      normalizedSource = "campaign";
    }
  }

  /**
   * -------------------------------------------------------
   * External referrer
   * -------------------------------------------------------
   */
  if (
    normalizedReferrer &&
    (
      normalizedSource === "direct" ||
      normalizedSource === "unknown"
    )
  ) {
    normalizedSource = "referral";
  }

  return {
    source: normalizedSource || "unknown",

    referrer:
      normalizedReferrer,

    referrerDomain:
      normalizedReferrer
        ? getReferrerDomain(
            normalizedReferrer
          )
        : "",

    utmSource:
      normalizedUtmSource,

    utmMedium:
      normalizedUtmMedium,

    utmCampaign:
      normalizedUtmCampaign,

    utmTerm:
      normalizedUtmTerm,

    utmContent:
      normalizedUtmContent,
  };
};

/**
 * ---------------------------------------------------------
 * GENERATE SESSION ID
 * ---------------------------------------------------------
 *
 * crypto.randomUUID() is preferred when available.
 *
 * ---------------------------------------------------------
 */
const generateSessionId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `session_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 12)}`;
};

/**
 * ---------------------------------------------------------
 * CHECK SESSION EXPIRY
 * ---------------------------------------------------------
 */
const isSessionExpired = (
  lastActivityAt
) => {
  if (!lastActivityAt) {
    return true;
  }

  const lastActivity =
    new Date(lastActivityAt).getTime();

  if (Number.isNaN(lastActivity)) {
    return true;
  }

  return (
    Date.now() - lastActivity >
    SESSION_TIMEOUT_MS
  );
};

/**
 * ---------------------------------------------------------
 * BUILD SESSION DATA
 * ---------------------------------------------------------
 */
const buildSessionData = ({
  sessionId,
  visitorId,
  visitor,
  user = null,

  entryPage = "",
  landingPage = "",

  userAgent = "",

  deviceType = "",
  browser = "",
  operatingSystem = "",

  country = "",
  state = "",
  city = "",

  source = "unknown",
  referrer = "",

  utmSource = "",
  utmMedium = "",
  utmCampaign = "",
  utmTerm = "",
  utmContent = "",
}) => {
    const visitorType =
    user?.role === "provider"
      ? "provider"
      : user
      ? "user"
      : visitor?.visitorType || "guest";

  const acquisition =
    resolveSessionAcquisition({
      source:
        source ||
        visitor?.source ||
        "unknown",

      referrer:
        referrer ||
        visitor?.referrer ||
        "",

      utmSource:
        utmSource ||
        visitor?.utmSource ||
        "",

      utmMedium:
        utmMedium ||
        visitor?.utmMedium ||
        "",

      utmCampaign:
        utmCampaign ||
        visitor?.utmCampaign ||
        "",

      utmTerm:
        utmTerm ||
        visitor?.utmTerm ||
        "",

      utmContent:
        utmContent ||
        visitor?.utmContent ||
        "",
    });

  const resolvedUserAgent =
    safeString(
      userAgent ||
      visitor?.userAgent ||
      ""
    );

  const resolvedDeviceType =
    safeString(deviceType) ||
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
    visitor?.browser ||
    (
      resolvedUserAgent
        ? detectBrowser(
            resolvedUserAgent
          )
        : ""
    );

  const resolvedOperatingSystem =
    safeString(operatingSystem) ||
    visitor?.operatingSystem ||
    (
      resolvedUserAgent
        ? detectOperatingSystem(
            resolvedUserAgent
          )
        : ""
    );

  return {
    sessionId,

    visitorId,

    visitor:
      visitor?._id || null,

    visitorType,

    user:
      user?._id ||
      visitor?.user ||
      null,

    startedAt: new Date(),

    lastActivityAt: new Date(),

    endedAt: null,

    durationSeconds: 0,

    pageViews: 0,

    events: 0,

    entryPage:
      safeString(entryPage),

    exitPage: "",

    landingPage:
      safeString(landingPage) ||
      safeString(entryPage),

    userAgent:
      resolvedUserAgent,

    deviceType:
      resolvedDeviceType,

    browser:
      resolvedBrowser,

    operatingSystem:
      resolvedOperatingSystem,

    country:
      safeString(country) ||
      visitor?.country ||
      "",

    state:
      safeString(state) ||
      visitor?.state ||
      "",

    city:
      safeString(city) ||
      visitor?.city ||
      "",

        source:
      acquisition.source,

    referrer:
      acquisition.referrer,

    /**
     * VisitorSession model may not yet expose
     * referrerDomain. Keep the normalized domain
     * available for future session-level analytics
     * without breaking the current schema.
     */
    referrerDomain:
      acquisition.referrerDomain,

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

    isActive: true,
  };
};

/**
 * =========================================================
 * CREATE SESSION
 * =========================================================
 */
const createSession = async ({
  sessionId = "",
  visitorId,
  visitor,
  user = null,

  userAgent = "",

  entryPage = "",
  landingPage = "",

  deviceType = "",
  browser = "",
  operatingSystem = "",

  country = "",
  state = "",
  city = "",

  source = "unknown",
  referrer = "",

  utmSource = "",
  utmMedium = "",
  utmCampaign = "",
  utmTerm = "",
  utmContent = "",
}) => {
    const resolvedSessionId =
    safeString(sessionId) ||
    generateSessionId();

  return VisitorSession.create(
    buildSessionData({
      sessionId:
        resolvedSessionId,

      visitorId,
      visitor,
      user,

      userAgent,

      entryPage,
      landingPage,

      deviceType,
      browser,
      operatingSystem,

      country,
      state,
      city,

      source,
      referrer,

      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
    })
  );
};

/**
 * =========================================================
 * GET ACTIVE SESSION
 * =========================================================
 */
export const getActiveSession = async (
  visitorId
) => {
  const id =
    safeString(visitorId);

  if (!id) {
    return null;
  }

  const session =
    await VisitorSession.findOne({
      visitorId: id,
      isActive: true,
    }).sort({
      lastActivityAt: -1,
    });

  if (!session) {
    return null;
  }

  /**
   * -------------------------------------------------------
   * SESSION TIMEOUT
   * -------------------------------------------------------
   */
  if (
    isSessionExpired(
      session.lastActivityAt
    )
  ) {
    session.isActive = false;

    session.endedAt =
      session.lastActivityAt ||
      new Date();

    session.durationSeconds =
      Math.max(
        0,
        Math.floor(
          (
            new Date(
              session.endedAt
            ).getTime() -
            new Date(
              session.startedAt
            ).getTime()
          ) / 1000
        )
      );

    await session.save();

    return null;
  }

  return session;
};

/**
 * =========================================================
 * START / GET SESSION
 * =========================================================
 */
export const trackSession = async ({
  sessionId = "",
  visitorId,
  user = null,

  userAgent = "",

  entryPage = "",
  landingPage = "",

  deviceType = "",
  browser = "",
  operatingSystem = "",

  country = "",
  state = "",
  city = "",

  source = "unknown",
  referrer = "",

  utmSource = "",
  utmMedium = "",
  utmCampaign = "",
  utmTerm = "",
  utmContent = "",
} = {}) => {
  const resolvedVisitorId =
    safeString(visitorId);

  /**
   * -------------------------------------------------------
   * Visitor ID required
   * -------------------------------------------------------
   */
  if (!resolvedVisitorId) {
    return {
      success: false,
      session: null,
      sessionId: null,
      isNewSession: false,
      message:
        "visitorId is required for session tracking.",
    };
  }

  /**
   * -------------------------------------------------------
   * Find visitor
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
      session: null,
      sessionId: null,
      isNewSession: false,
      message:
        "Visitor was not found.",
    };
  }

  /**
   * -------------------------------------------------------
   * Find existing active session
   * -------------------------------------------------------
   */
    let session = null;

  const requestedSessionId =
    safeString(sessionId);

  /**
   * -------------------------------------------------------
   * Prefer the client sessionId when it belongs to
   * this visitor.
   *
   * This keeps frontend and backend session identity
   * consistent.
   * -------------------------------------------------------
   */
  if (requestedSessionId) {
    session =
      await VisitorSession.findOne({
        sessionId:
          requestedSessionId,

        visitorId:
          resolvedVisitorId,

        isActive: true,
      });

    if (
      session &&
      isSessionExpired(
        session.lastActivityAt
      )
    ) {
      session.isActive = false;

      session.endedAt =
        session.lastActivityAt ||
        new Date();

      session.durationSeconds =
        Math.max(
          0,
          Math.floor(
            (
              new Date(
                session.endedAt
              ).getTime() -
              new Date(
                session.startedAt
              ).getTime()
            ) / 1000
          )
        );

      await session.save();

      session = null;
    }
  }

  /**
   * -------------------------------------------------------
   * If requested session does not exist, reuse the latest
   * active backend session.
   * -------------------------------------------------------
   */
  if (!session) {
    session =
      await getActiveSession(
        resolvedVisitorId
      );
  }

  /**
   * -------------------------------------------------------
   * CREATE NEW SESSION
   * -------------------------------------------------------
   */
  if (!session) {
    session =
      await createSession({
        sessionId:
          requestedSessionId,

        visitorId:
          resolvedVisitorId,

        visitor,

        user,

        userAgent,

        entryPage,
        landingPage,

        deviceType,
        browser,
        operatingSystem,

        country,
        state,
        city,

        source,
        referrer,

        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
      });

    return {
      success: true,

      session,

      sessionId:
        session.sessionId,

      visitorId:
        resolvedVisitorId,

      visitorType:
        session.visitorType,

      isNewSession: true,
    };
  }

  /**
   * -------------------------------------------------------
   * UPDATE EXISTING SESSION
   * -------------------------------------------------------
   */
  session.lastActivityAt =
    new Date();

  session.isActive = true;

  /**
   * -------------------------------------------------------
   * AUTHENTICATED ASSOCIATION
   * -------------------------------------------------------
   */
  if (user?._id) {
    session.user =
      user._id;

    session.visitorType =
      user.role === "provider"
        ? "provider"
        : "user";
  }

  /**
   * -------------------------------------------------------
   * Update entry/landing page only
   * when session data is currently empty.
   * -------------------------------------------------------
   */
  if (
    !safeString(session.entryPage) &&
    safeString(entryPage)
  ) {
    session.entryPage =
      safeString(entryPage);
  }

  if (
    !safeString(session.landingPage) &&
    safeString(landingPage)
  ) {
    session.landingPage =
      safeString(landingPage);
  }

  /**
   * -------------------------------------------------------
   * Context updates
   * -------------------------------------------------------
   */
  if (safeString(deviceType)) {

      if (safeString(userAgent)) {
    session.userAgent =
      safeString(userAgent);

    if (!safeString(deviceType)) {
      session.deviceType =
        detectDeviceType(
          safeString(userAgent)
        );
    }

    if (!safeString(browser)) {
      session.browser =
        detectBrowser(
          safeString(userAgent)
        );
    }

    if (!safeString(operatingSystem)) {
      session.operatingSystem =
        detectOperatingSystem(
          safeString(userAgent)
        );
    }
  }

    session.deviceType =
      safeString(deviceType);
  }

  if (safeString(browser)) {
    session.browser =
      safeString(browser);
  }

  if (safeString(operatingSystem)) {
    session.operatingSystem =
      safeString(operatingSystem);
  }

  if (safeString(country)) {
    session.country =
      safeString(country);
  }

  if (safeString(state)) {
    session.state =
      safeString(state);
  }

  if (safeString(city)) {
    session.city =
      safeString(city);
  }

    const incomingAcquisition =
    resolveSessionAcquisition({
      source,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
    });

  /**
   * -------------------------------------------------------
   * Preserve session acquisition.
   *
   * Do NOT replace a valid first-touch source with
   * "unknown", "direct", or an internal referrer
   * on subsequent page views.
   * -------------------------------------------------------
   */
  const currentSessionSource =
    normalizeSource(
      session.source
    );

  const hasIncomingAcquisition =
    incomingAcquisition.source !==
      "unknown" &&
    (
      incomingAcquisition.referrer ||
      incomingAcquisition.utmSource ||
      incomingAcquisition.utmMedium ||
      incomingAcquisition.utmCampaign ||
      incomingAcquisition.source !==
        "direct"
    );

  const hasSessionAcquisition =
    currentSessionSource !==
      "unknown" &&
    currentSessionSource !==
      "direct";

  if (
    !hasSessionAcquisition &&
    hasIncomingAcquisition
  ) {
    session.source =
      incomingAcquisition.source;

    session.referrer =
      incomingAcquisition.referrer;

    session.utmSource =
      incomingAcquisition.utmSource;

    session.utmMedium =
      incomingAcquisition.utmMedium;

    session.utmCampaign =
      incomingAcquisition.utmCampaign;

    session.utmTerm =
      incomingAcquisition.utmTerm;

    session.utmContent =
      incomingAcquisition.utmContent;
  }

  await session.save();

  return {
    success: true,

    session,

    sessionId:
      session.sessionId,

    visitorId:
      resolvedVisitorId,

    visitorType:
      session.visitorType,

    isNewSession: false,
  };
};

/**
 * =========================================================
 * TOUCH SESSION
 * =========================================================
 *
 * Called whenever a tracked activity occurs.
 *
 * ---------------------------------------------------------
 */
export const touchSession = async (
  sessionId
) => {
  const id =
    safeString(sessionId);

  if (!id) {
    return null;
  }

    const session =
    await VisitorSession.findOne({
      sessionId: id,
    });

  if (!session) {
    return null;
  }

  /**
   * -------------------------------------------------------
   * Do not revive an expired session.
   * -------------------------------------------------------
   */
  if (
    isSessionExpired(
      session.lastActivityAt
    )
  ) {
    session.isActive = false;

    session.endedAt =
      session.lastActivityAt ||
      new Date();

    session.durationSeconds =
      Math.max(
        0,
        Math.floor(
          (
            new Date(
              session.endedAt
            ).getTime() -
            new Date(
              session.startedAt
            ).getTime()
          ) / 1000
        )
      );

    await session.save();

    return null;
  }

  session.lastActivityAt =
    new Date();

  session.isActive = true;

  await session.save();

  return session;
};

/**
 * =========================================================
 * INCREMENT PAGE VIEW COUNT
 * =========================================================
 */
export const incrementSessionPageViews =
  async (sessionId) => {
    const id =
      safeString(sessionId);

    if (!id) {
      return null;
    }

    return VisitorSession.findOneAndUpdate(
      {
        sessionId: id,
      },
      {
        $inc: {
          pageViews: 1,
        },

        $set: {
          lastActivityAt:
            new Date(),

          isActive: true,
        },
      },
      {
        new: true,
      }
    );
  };

/**
 * =========================================================
 * INCREMENT EVENT COUNT
 * =========================================================
 */
export const incrementSessionEvents =
  async (sessionId) => {
    const id =
      safeString(sessionId);

    if (!id) {
      return null;
    }

    return VisitorSession.findOneAndUpdate(
      {
        sessionId: id,
      },
      {
        $inc: {
          events: 1,
        },

        $set: {
          lastActivityAt:
            new Date(),

          isActive: true,
        },
      },
      {
        new: true,
      }
    );
  };

/**
 * =========================================================
 * END SESSION
 * =========================================================
 */
export const endSession = async (
  sessionId,
  exitPage = ""
) => {
  const id =
    safeString(sessionId);

  if (!id) {
    return null;
  }

  const session =
    await VisitorSession.findOne({
      sessionId: id,
    });

  if (!session) {
    return null;
  }

  const now =
    new Date();

  session.lastActivityAt =
    now;

  session.endedAt =
    now;

  session.isActive =
    false;

  if (safeString(exitPage)) {
    session.exitPage =
      safeString(exitPage);
  }

  session.durationSeconds =
    Math.max(
      0,
      Math.floor(
        (
          now.getTime() -
          new Date(
            session.startedAt
          ).getTime()
        ) / 1000
      )
    );

  await session.save();

  return session;
};

/**
 =========================================================
 * EXPORT SESSION CONSTANTS
 * =========================================================
 */
export const SESSION_TIMEOUT =
  SESSION_TIMEOUT_MINUTES;