// backend/services/analytics/visitorTrackingService.js

import Visitor from "../../models/Visitor.js";

/**
 * =========================================================
 * 👤 SERVDIAL — VISITOR TRACKING SERVICE
 * =========================================================
 *
 * RESPONSIBILITY:
 *
 * - Identify visitor
 * - Support guest / user / provider
 * - Create visitor on first visit
 * - Maintain first-touch acquisition data
 * - Update visitor activity
 * - Associate authenticated user/provider
 * - Capture device / browser / operating system
 * - Never use IP as visitor identity
 *
 * ANALYTICS FLOW:
 *
 * Request
 *   ↓
 * Visitor ID
 *   ↓
 * Visitor Type
 *   ↓
 * Find / Create Visitor
 *   ↓
 * First-touch attribution
 *   ↓
 * Update activity / identity
 *   ↓
 * Return visitor context
 *
 * IMPORTANT:
 *
 * First-touch acquisition fields are intentionally NOT
 * overwritten on every page view.
 *
 * This prevents a visitor arriving from Google, then
 * navigating internally, from becoming "direct".
 * =========================================================
 */


/* =========================================================
   CONSTANTS
========================================================= */

const VISITOR_TYPES = [
  "guest",
  "user",
  "provider",
];

const TRAFFIC_SOURCES = [
  "direct",
  "organic",
  "social",
  "referral",
  "email",
  "paid_search",
  "paid_social",
  "display",
  "campaign",
  "other",
  "unknown",
];

const MAX_STRING_LENGTH = 500;
const MAX_REFERRER_LENGTH = 2000;


/* =========================================================
   SAFE STRING
========================================================= */

const safeString = (value = "", maxLength = MAX_STRING_LENGTH) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
};


/* =========================================================
   SAFE OBJECT ID VALUE
========================================================= */

const getUserId = (user) => {
  if (!user?._id) {
    return null;
  }

  return user._id;
};


/* =========================================================
   VISITOR TYPE
========================================================= */

const getVisitorType = (user = null) => {
  if (!user) {
    return "guest";
  }

  if (user.role === "provider") {
    return "provider";
  }

  if (
    user.role === "admin" ||
    user.role === "superadmin"
  ) {
    return null;
  }

  return "user";
};


/* =========================================================
   NORMALIZE TRAFFIC SOURCE
========================================================= */

const normalizeSource = (source = "") => {
  const value = safeString(source).toLowerCase();

  if (!value) {
    return "unknown";
  }

  if (TRAFFIC_SOURCES.includes(value)) {
    return value;
  }

  /*
   * Backward compatibility for older analytics data.
   */
  if (value === "paid") {
    return "campaign";
  }

  if (value === "ads") {
    return "campaign";
  }

  return "other";
};


/* =========================================================
   NORMALIZE REFERRER
========================================================= */

const normalizeReferrer = (referrer = "") => {
  return safeString(
    referrer,
    MAX_REFERRER_LENGTH
  );
};


/* =========================================================
   REFERRER DOMAIN
========================================================= */

const getReferrerDomain = (referrer = "") => {
  const value = normalizeReferrer(referrer);

  if (!value) {
    return "";
  }

  try {
    /*
     * document.referrer normally contains a full URL.
     *
     * URL also handles protocol-relative URLs after adding
     * a temporary protocol.
     */
    const url = new URL(
      value,
      "https://www.servdial.com"
    );

    let hostname = safeString(
      url.hostname,
      255
    ).toLowerCase();

    if (!hostname) {
      return "";
    }

    /*
     * Remove leading www for consistent analytics grouping.
     */
    hostname = hostname.replace(/^www\./, "");

    return hostname;
  } catch {
    /*
     * If the referrer is malformed, preserve raw referrer
     * but do not create a misleading domain.
     */
    return "";
  }
};


/* =========================================================
   INTERNAL REFERRER CHECK
========================================================= */

const isInternalReferrer = (referrer = "") => {
  const domain = getReferrerDomain(referrer);

  if (!domain) {
    return false;
  }

  const internalDomains = [
    "servdial.com",
    "localhost",
    "127.0.0.1",
  ];

  return internalDomains.some(
    (internalDomain) =>
      domain === internalDomain ||
      domain.endsWith(`.${internalDomain}`)
  );
};


/* =========================================================
   DEVICE TYPE
========================================================= */

const detectDeviceType = (userAgent = "") => {
  const ua = safeString(
    userAgent,
    2000
  ).toLowerCase();

  if (!ua) {
    return "unknown";
  }

  /*
   * Tablets first because many tablet UAs also contain
   * Android / mobile-like tokens.
   */
  if (
    /ipad|tablet|playbook|silk/i.test(ua) ||
    (
      /android/i.test(ua) &&
      !/mobile/i.test(ua)
    )
  ) {
    return "tablet";
  }

  if (
    /mobi|iphone|ipod|android.*mobile|windows phone/i.test(
      ua
    )
  ) {
    return "mobile";
  }

  if (
    /windows|macintosh|mac os x|linux|cros|x11/i.test(
      ua
    )
  ) {
    return "desktop";
  }

  return "unknown";
};


/* =========================================================
   BROWSER
========================================================= */

const detectBrowser = (userAgent = "") => {
  const ua = safeString(
    userAgent,
    2000
  );

  if (!ua) {
    return "";
  }

  /*
   * Order matters.
   *
   * Edge and Opera contain Chrome tokens in their UA.
   */
  if (
    /edg\/|edga\/|edgios\//i.test(ua)
  ) {
    return "Edge";
  }

  if (
    /opr\/|opera/i.test(ua)
  ) {
    return "Opera";
  }

  if (
    /firefox\/|fxios\//i.test(ua)
  ) {
    return "Firefox";
  }

  if (
    /crios\//i.test(ua)
  ) {
    return "Chrome";
  }

  if (
    /chrome\//i.test(ua) &&
    !/edg\//i.test(ua) &&
    !/opr\//i.test(ua)
  ) {
    return "Chrome";
  }

  if (
    /safari\//i.test(ua) &&
    !/chrome\//i.test(ua) &&
    !/crios\//i.test(ua) &&
    !/android/i.test(ua)
  ) {
    return "Safari";
  }

  if (
    /msie|trident/i.test(ua)
  ) {
    return "Internet Explorer";
  }

  return "Unknown";
};


/* =========================================================
   OPERATING SYSTEM
========================================================= */

const detectOperatingSystem = (userAgent = "") => {
  const ua = safeString(
    userAgent,
    2000
  );

  if (!ua) {
    return "Unknown";
  }

  /*
   * iOS before macOS because iPad/iPhone UAs can contain
   * Macintosh in newer Safari versions.
   */
  if (
    /iphone|ipad|ipod/i.test(ua)
  ) {
    return "iOS";
  }

  if (
    /android/i.test(ua)
  ) {
    return "Android";
  }

  if (
    /windows phone/i.test(ua)
  ) {
    return "Windows Phone";
  }

  if (
    /windows nt/i.test(ua)
  ) {
    return "Windows";
  }

  if (
    /cros/i.test(ua)
  ) {
    return "ChromeOS";
  }

  if (
    /macintosh|mac os x/i.test(ua)
  ) {
    return "macOS";
  }

  if (
    /linux/i.test(ua)
  ) {
    return "Linux";
  }

  return "Unknown";
};


/* =========================================================
   VISITOR ID
========================================================= */

const getVisitorId = ({
  visitorId,
  user = null,
} = {}) => {
  const clientVisitorId = safeString(
    visitorId,
    200
  );

  /*
   * Guest visitors MUST provide a stable client-side ID.
   */
  if (clientVisitorId) {
    return clientVisitorId;
  }

  /*
   * Authenticated users have a deterministic fallback.
   */
  if (user?._id) {
    return `user_${String(user._id)}`;
  }

  return null;
};


/* =========================================================
   FIRST-TOUCH ATTRIBUTION DATA
========================================================= */

const buildAcquisitionData = ({
  source,
  referrer,
  utmSource,
  utmMedium,
  utmCampaign,
  utmTerm,
  utmContent,
} = {}) => {
  const normalizedReferrer =
    normalizeReferrer(referrer);

  const externalReferrer =
    isInternalReferrer(normalizedReferrer)
      ? ""
      : normalizedReferrer;

  const normalizedUtmSource =
    safeString(utmSource).toLowerCase();

  const normalizedUtmMedium =
    safeString(utmMedium).toLowerCase();

  const normalizedUtmCampaign =
    safeString(utmCampaign);

  const hasUtm =
    Boolean(
      normalizedUtmSource ||
      normalizedUtmMedium ||
      normalizedUtmCampaign ||
      safeString(utmTerm) ||
      safeString(utmContent)
    );

  let normalizedSource =
    normalizeSource(source);

  /*
   * =======================================================
   * SERVER-SIDE ACQUISITION CLASSIFICATION
   * =======================================================
   *
   * UTM medium is more authoritative than a generic
   * frontend "campaign" label.
   *
   * Examples:
   *
   * utm_medium=cpc
   *      -> paid_search
   *
   * utm_medium=paid_social
   *      -> paid_social
   *
   * utm_medium=email
   *      -> email
   *
   * utm_medium=display
   *      -> display
   *
   * Other UTM traffic
   *      -> campaign
   *
   * No UTM
   *      -> preserve detected source
   */

  if (hasUtm) {
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

  /*
   * If there is an external referrer but the incoming source
   * is direct/unknown, do not classify it as direct.
   *
   * The detailed search/social classification will be handled
   * by the frontend + later shared acquisition logic.
   */
  if (
    !hasUtm &&
    externalReferrer &&
    (
      normalizedSource === "direct" ||
      normalizedSource === "unknown"
    )
  ) {
    normalizedSource = "referral";
  }

  return {
    source:
      normalizedSource,

    referrer:
      externalReferrer,

    referrerDomain:
      getReferrerDomain(externalReferrer),

    utmSource:
      safeString(utmSource),

    utmMedium:
      safeString(utmMedium),

    utmCampaign:
      normalizedUtmCampaign,

    utmTerm:
      safeString(utmTerm),

    utmContent:
      safeString(utmContent),
  };
};


/* =========================================================
   DEVICE DATA
========================================================= */

const buildDeviceData = (
  userAgent = ""
) => {
  const ua = safeString(
    userAgent,
    2000
  );

  if (!ua) {
    return {
      userAgent: "",
      deviceType: "unknown",
      browser: "",
      operatingSystem: "Unknown",
    };
  }

  return {
    userAgent: ua,
    deviceType:
      detectDeviceType(ua),
    browser:
      detectBrowser(ua),
    operatingSystem:
      detectOperatingSystem(ua),
  };
};


/* =========================================================
   CREATE VISITOR DATA
========================================================= */

const buildVisitorData = ({
  visitorId,
  visitorType,
  user,
  userAgent,
  source,
  referrer,
  utmSource,
  utmMedium,
  utmCampaign,
  utmTerm,
  utmContent,
  country,
  state,
  city,
} = {}) => {
  const now = new Date();

  const acquisition =
    buildAcquisitionData({
      source,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
    });

  const device =
    buildDeviceData(userAgent);

  return {
    visitorId,

    visitorType,

    user:
      getUserId(user),

    firstSeenAt: now,
    lastSeenAt: now,

    ...device,

    country:
      safeString(country),

    state:
      safeString(state),

    city:
      safeString(city),

    ...acquisition,

    isActive: true,
  };
};


/* =========================================================
   UPDATE DEVICE CONTEXT
========================================================= */

const updateDeviceContext = (
  visitor,
  userAgent
) => {
  const ua = safeString(
    userAgent,
    2000
  );

  if (!ua) {
    return;
  }

  const device =
    buildDeviceData(ua);

  visitor.userAgent =
    device.userAgent;

  visitor.deviceType =
    device.deviceType;

  visitor.browser =
    device.browser;

  visitor.operatingSystem =
    device.operatingSystem;
};


/* =========================================================
   IDENTIFY / TRACK VISITOR
========================================================= */

export const trackVisitor = async ({
  visitorId,
  user = null,
  userAgent = "",
  source = "unknown",
  referrer = "",
  utmSource = "",
  utmMedium = "",
  utmCampaign = "",
  utmTerm = "",
  utmContent = "",
  country = "",
  state = "",
  city = "",
} = {}) => {

  /* =====================================================
     EXCLUDE ADMIN USERS
  ===================================================== */

  if (
    user?.role === "admin" ||
    user?.role === "superadmin"
  ) {
    return {
      success: false,
      excluded: true,
      visitor: null,
      visitorId: null,
      visitorType: null,
      message:
        "Admin visitors are excluded from visitor analytics.",
    };
  }


  /* =====================================================
     RESOLVE VISITOR TYPE
  ===================================================== */

  const resolvedVisitorType =
    getVisitorType(user);

  if (!resolvedVisitorType) {
    return {
      success: false,
      excluded: true,
      visitor: null,
      visitorId: null,
      visitorType: null,
      message:
        "This user type is excluded from visitor analytics.",
    };
  }


  /* =====================================================
     RESOLVE VISITOR ID
  ===================================================== */

  const resolvedVisitorId =
    getVisitorId({
      visitorId,
      user,
    });

  if (!resolvedVisitorId) {
    return {
      success: false,
      visitor: null,
      visitorId: null,
      visitorType:
        resolvedVisitorType,
      message:
        "visitorId is required for guest visitor tracking.",
    };
  }


  /* =====================================================
     FIND EXISTING VISITOR
  ===================================================== */

  let visitor =
    await Visitor.findOne({
      visitorId:
        resolvedVisitorId,
    });


  /* =====================================================
     CREATE NEW VISITOR
  ===================================================== */

  if (!visitor) {
    try {
      visitor =
        await Visitor.create(
          buildVisitorData({
            visitorId:
              resolvedVisitorId,

            visitorType:
              resolvedVisitorType,

            user,

            userAgent,

            source,

            referrer,

            utmSource,

            utmMedium,

            utmCampaign,

            utmTerm,

            utmContent,

            country,

            state,

            city,
          })
        );
    } catch (error) {

      /*
       * Two simultaneous first requests can race.
       *
       * If another request created the same visitor first,
       * recover by loading that visitor instead of failing
       * the analytics request.
       */
      if (
        error?.code === 11000
      ) {
        visitor =
          await Visitor.findOne({
            visitorId:
              resolvedVisitorId,
          });
      } else {
        throw error;
      }
    }

    if (visitor) {
      return {
        success: true,
        visitor,
        visitorId:
          visitor.visitorId,
        visitorType:
          visitor.visitorType,
        isNewVisitor:
          true,
      };
    }
  }


  /* =====================================================
     EXISTING VISITOR SAFETY CHECK
  ===================================================== */

  if (!visitor) {
    return {
      success: false,
      visitor: null,
      visitorId:
        resolvedVisitorId,
      visitorType:
        resolvedVisitorType,
      message:
        "Unable to create or retrieve visitor.",
    };
  }


  /* =====================================================
     UPDATE ACTIVITY
  ===================================================== */

  const now = new Date();

  visitor.lastSeenAt =
    now;

  visitor.isActive =
    true;


  /* =====================================================
     AUTHENTICATED IDENTITY ASSOCIATION
  ===================================================== */

  if (user?._id) {
    visitor.user =
      user._id;

    visitor.visitorType =
      resolvedVisitorType;
  }


  /* =====================================================
     DEVICE / TECHNOLOGY
  ===================================================== */

  if (
    safeString(userAgent)
  ) {
    updateDeviceContext(
      visitor,
      userAgent
    );
  }


  /* =====================================================
     IMPORTANT:
     DO NOT OVERWRITE FIRST-TOUCH ACQUISITION
  ===================================================== */

  /*
   * The visitor's original acquisition source/referrer/UTMs
   * should remain stable.
   *
   * Example:
   *
   * First visit:
   * Google → organic
   *
   * Later:
   * ServDial internal navigation
   *
   * Visitor source must remain:
   * organic
   *
   * This is essential for meaningful acquisition analytics.
   */

  const hasExistingAcquisition =
    Boolean(
      safeString(visitor.source) &&
      visitor.source !== "unknown"
    );

  const incomingAcquisition =
    buildAcquisitionData({
      source,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
    });

  if (
    !hasExistingAcquisition &&
    incomingAcquisition.source !== "unknown"
  ) {
    visitor.source =
      incomingAcquisition.source;

    visitor.referrer =
      incomingAcquisition.referrer;

    visitor.referrerDomain =
      incomingAcquisition.referrerDomain;

    visitor.utmSource =
      incomingAcquisition.utmSource;

    visitor.utmMedium =
      incomingAcquisition.utmMedium;

    visitor.utmCampaign =
      incomingAcquisition.utmCampaign;

    visitor.utmTerm =
      incomingAcquisition.utmTerm;

    visitor.utmContent =
      incomingAcquisition.utmContent;
  }


  /* =====================================================
     LOCATION
  ===================================================== */

  if (safeString(country)) {
    visitor.country =
      safeString(country);
  }

  if (safeString(state)) {
    visitor.state =
      safeString(state);
  }

  if (safeString(city)) {
    visitor.city =
      safeString(city);
  }


  /* =====================================================
     SAVE
  ===================================================== */

  await visitor.save();


  /* =====================================================
     RETURN VISITOR CONTEXT
  ===================================================== */

  return {
    success: true,

    visitor,

    visitorId:
      visitor.visitorId,

    visitorType:
      visitor.visitorType,

    isNewVisitor: false,
  };
};


/* =========================================================
   GET VISITOR
========================================================= */

export const getVisitorById = async (
  visitorId
) => {
  const id =
    safeString(
      visitorId,
      200
    );

  if (!id) {
    return null;
  }

  return Visitor.findOne({
    visitorId: id,
  });
};


/* =========================================================
   TOUCH VISITOR
========================================================= */

export const touchVisitor = async (
  visitorId
) => {
  const id =
    safeString(
      visitorId,
      200
    );

  if (!id) {
    return null;
  }

  return Visitor.findOneAndUpdate(
    {
      visitorId: id,
    },
    {
      $set: {
        lastSeenAt:
          new Date(),

        isActive:
          true,
      },
    },
    {
      new: true,
    }
  );
};


/* =========================================================
   EXPORT HELPERS
========================================================= */

export {
  getVisitorType,
  getVisitorId,
  detectDeviceType,
  detectBrowser,
  detectOperatingSystem,
  normalizeSource,
  normalizeReferrer,
  getReferrerDomain,
  isInternalReferrer,
};