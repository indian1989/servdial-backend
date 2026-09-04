// backend/services/analytics/visitorTrackingService.js
import Visitor from "../../models/Visitor.js";

/**
 * =========================================================
 * 👤 VISITOR TRACKING SERVICE
 * =========================================================
 *
 * RESPONSIBILITY:
 *
 * - Identify visitor
 * - Support guest / user / provider
 * - Create visitor when first seen
 * - Update lastSeenAt
 * - Associate authenticated user/provider
 * - Never use IP as visitor identity
 *
 * FLOW:
 *
 * Request
 *   ↓
 * Identify visitor
 *   ↓
 * Guest / User / Provider
 *   ↓
 * Find/Create Visitor
 *   ↓
 * Update lastSeenAt
 *   ↓
 * Return visitor context
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
 * VISITOR TYPE
 * ---------------------------------------------------------
 */
const getVisitorType = (user) => {
  if (!user) {
    return "guest";
  }

  if (user.role === "provider") {
    return "provider";
  }

  return "user";
};

/**
 * ---------------------------------------------------------
 * DEVICE TYPE
 * ---------------------------------------------------------
 */
const detectDeviceType = (userAgent = "") => {
  const ua = safeString(userAgent).toLowerCase();

  if (!ua) {
    return "unknown";
  }

  if (/ipad|tablet|playbook|silk/i.test(ua)) {
    return "tablet";
  }

  if (
    /mobile|iphone|ipod|android.*mobile|windows phone/i.test(
      ua
    )
  ) {
    return "mobile";
  }

  if (
    /windows|macintosh|linux|cros|x11/i.test(ua)
  ) {
    return "desktop";
  }

  return "unknown";
};

/**
 * ---------------------------------------------------------
 * BROWSER
 * ---------------------------------------------------------
 */
const detectBrowser = (userAgent = "") => {
  const ua = safeString(userAgent);

  if (!ua) {
    return "";
  }

  if (/edg\//i.test(ua)) {
    return "Edge";
  }

  if (/opr\//i.test(ua)) {
    return "Opera";
  }

  if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) {
    return "Chrome";
  }

  if (/firefox\//i.test(ua)) {
    return "Firefox";
  }

  if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) {
    return "Safari";
  }

  if (/msie|trident/i.test(ua)) {
    return "Internet Explorer";
  }

  return "Unknown";
};

/**
 * ---------------------------------------------------------
 * OPERATING SYSTEM
 * ---------------------------------------------------------
 */
const detectOperatingSystem = (userAgent = "") => {
  const ua = safeString(userAgent);

  if (!ua) {
    return "Unknown";
  }

  if (/windows nt/i.test(ua)) {
    return "Windows";
  }

  if (/android/i.test(ua)) {
    return "Android";
  }

  if (/iphone|ipad|ipod/i.test(ua)) {
    return "iOS";
  }

  if (/mac os x/i.test(ua)) {
    return "macOS";
  }

  if (/linux/i.test(ua)) {
    return "Linux";
  }

  if (/cros/i.test(ua)) {
    return "ChromeOS";
  }

  return "Unknown";
};

/**
 * ---------------------------------------------------------
 * VISITOR ID
 * ---------------------------------------------------------
 *
 * IMPORTANT:
 *
 * Guest visitor ID should come from the client.
 *
 * Do NOT generate a new ID on every request.
 * The frontend should persist the anonymous ID and send
 * the same visitorId on subsequent requests.
 *
 * Authenticated visitors can use a stable visitorId
 * associated with their account.
 *
 * ---------------------------------------------------------
 */
const getVisitorId = ({
  visitorId,
  user,
}) => {
  const clientVisitorId = safeString(visitorId);

  if (clientVisitorId) {
    return clientVisitorId;
  }

  if (user?._id) {
    return `user_${String(user._id)}`;
  }

  return null;
};

/**
 * ---------------------------------------------------------
 * CREATE VISITOR DATA
 * ---------------------------------------------------------
 */
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
}) => {
  return {
    visitorId,

    visitorType,

    user:
      user?._id || null,

    firstSeenAt: new Date(),

    lastSeenAt: new Date(),

    userAgent: safeString(userAgent),

    deviceType:
      detectDeviceType(userAgent),

    browser:
      detectBrowser(userAgent),

    operatingSystem:
      detectOperatingSystem(userAgent),

    country:
      safeString(country),

    state:
      safeString(state),

    city:
      safeString(city),

    source:
      safeString(source) || "unknown",

    referrer:
      safeString(referrer),

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
 * IDENTIFY / TRACK VISITOR
 * =========================================================
 */
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

  const resolvedVisitorType =
    getVisitorType(user);

  const resolvedVisitorId =
    getVisitorId({
      visitorId,
      user,
    });


  /**
   * -------------------------------------------------------
   * Visitor ID is mandatory for tracking.
   * -------------------------------------------------------
   */
  if (!resolvedVisitorId) {
    return {
      success: false,
      visitor: null,
      visitorId: null,
      visitorType: resolvedVisitorType,
      message:
        "visitorId is required for guest visitor tracking.",
    };
  }

  const now = new Date();

  /**
   * -------------------------------------------------------
   * Find existing visitor
   * -------------------------------------------------------
   */
  let visitor =
    await Visitor.findOne({
      visitorId:
        resolvedVisitorId,
    });

  /**
   * -------------------------------------------------------
   * CREATE NEW VISITOR
   * -------------------------------------------------------
   */
  if (!visitor) {
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

    return {
      success: true,
      visitor,
      visitorId:
        visitor.visitorId,
      visitorType:
        visitor.visitorType,
      isNewVisitor: true,
    };
  }

  /**
   * -------------------------------------------------------
   * UPDATE EXISTING VISITOR
   * -------------------------------------------------------
   */
  visitor.lastSeenAt = now;

  visitor.isActive = true;

  /**
   * -------------------------------------------------------
   * AUTHENTICATED IDENTITY ASSOCIATION
   * -------------------------------------------------------
   *
   * Guest can become user/provider after login/register.
   *
   * Once authenticated, associate the visitor with the
   * authenticated account.
   *
   * -------------------------------------------------------
   */
  if (user?._id) {
    visitor.user = user._id;

    visitor.visitorType =
      resolvedVisitorType;
  }

  /**
   * -------------------------------------------------------
   * Update context only when supplied
   * -------------------------------------------------------
   */
  if (safeString(userAgent)) {
    visitor.userAgent =
      safeString(userAgent);

    visitor.deviceType =
      detectDeviceType(userAgent);

    visitor.browser =
      detectBrowser(userAgent);

    visitor.operatingSystem =
      detectOperatingSystem(userAgent);
  }

  if (safeString(source)) {
    visitor.source =
      safeString(source);
  }

  if (safeString(referrer)) {
    visitor.referrer =
      safeString(referrer);
  }

  if (safeString(utmSource)) {
    visitor.utmSource =
      safeString(utmSource);
  }

  if (safeString(utmMedium)) {
    visitor.utmMedium =
      safeString(utmMedium);
  }

  if (safeString(utmCampaign)) {
    visitor.utmCampaign =
      safeString(utmCampaign);
  }

  if (safeString(utmTerm)) {
    visitor.utmTerm =
      safeString(utmTerm);
  }

  if (safeString(utmContent)) {
    visitor.utmContent =
      safeString(utmContent);
  }

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

  await visitor.save();

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

/**
 * =========================================================
 * GET VISITOR
 * =========================================================
 */
export const getVisitorById = async (
  visitorId
) => {
  const id =
    safeString(visitorId);

  if (!id) {
    return null;
  }

  return Visitor.findOne({
    visitorId: id,
  });
};

/**
 * =========================================================
 * MARK VISITOR ACTIVE
 * =========================================================
 */
export const touchVisitor = async (
  visitorId
) => {
  const id =
    safeString(visitorId);

  if (!id) {
    return null;
  }

  return Visitor.findOneAndUpdate(
    {
      visitorId: id,
    },
    {
      $set: {
        lastSeenAt: new Date(),
        isActive: true,
      },
    },
    {
      new: true,
    }
  );
};