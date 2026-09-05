// backend/services/analytics/sessionTrackingService.js
import VisitorSession from "../../models/VisitorSession.js";
import Visitor from "../../models/Visitor.js";

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

    deviceType:
      safeString(deviceType) ||
      visitor?.deviceType ||
      "unknown",

    browser:
      safeString(browser) ||
      visitor?.browser ||
      "",

    operatingSystem:
      safeString(operatingSystem) ||
      visitor?.operatingSystem ||
      "",

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
      safeString(source) ||
      visitor?.source ||
      "unknown",

    referrer:
      safeString(referrer) ||
      visitor?.referrer ||
      "",

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

    isActive: true,
  };
};

/**
 * =========================================================
 * CREATE SESSION
 * =========================================================
 */
const createSession = async ({
  visitorId,
  visitor,
  user = null,

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
  const sessionId =
    generateSessionId();

  return VisitorSession.create(
    buildSessionData({
      sessionId,

      visitorId,
      visitor,
      user,

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
  visitorId,
  user = null,

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
  let session =
    await getActiveSession(
      resolvedVisitorId
    );

  /**
   * -------------------------------------------------------
   * CREATE NEW SESSION
   * -------------------------------------------------------
   */
  if (!session) {
    session =
      await createSession({
        visitorId:
          resolvedVisitorId,

        visitor,

        user,

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

  if (safeString(source)) {
    session.source =
      safeString(source);
  }

  if (safeString(referrer)) {
    session.referrer =
      safeString(referrer);
  }

  if (safeString(utmSource)) {
    session.utmSource =
      safeString(utmSource);
  }

  if (safeString(utmMedium)) {
    session.utmMedium =
      safeString(utmMedium);
  }

  if (safeString(utmCampaign)) {
    session.utmCampaign =
      safeString(utmCampaign);
  }

  if (safeString(utmTerm)) {
    session.utmTerm =
      safeString(utmTerm);
  }

  if (safeString(utmContent)) {
    session.utmContent =
      safeString(utmContent);
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