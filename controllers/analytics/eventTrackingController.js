// backend/controllers/analytics/eventTrackingController.js

import asyncHandler from "express-async-handler";

import {
  trackEvent,
  trackBusinessAction,
  trackSearchEvent,
  trackAuthEvent,
  getEventById,
  getSessionEvents,
} from "../../services/analytics/eventTrackingService.js";

/**
 * =========================================================
 * ⚡ EVENT TRACKING CONTROLLER
 * =========================================================
 *
 * RESPONSIBILITY:
 *
 * - Receive platform behavioral events
 * - Delegate tracking to eventTrackingService
 * - Keep controller thin
 *
 * IMPORTANT:
 *
 * - No Business.views increment here.
 * - Existing BusinessView / BusinessClick remain separate.
 * - No IP-based visitor identity.
 *
 * =========================================================
 */

/**
 * =========================================================
 * TRACK GENERIC EVENT
 * =========================================================
 */
export const trackEventController =
  asyncHandler(async (req, res) => {
   
    console.log("🔎 SEARCH ANALYTICS AUTH:", {
  userId: req.user?._id || null,
  role: req.user?.role || null,
  hasAuthorization:
    Boolean(req.headers.authorization),
  visitorId:
    req.body?.visitorId ||
    req.headers["x-visitor-id"] ||
    "",
});
   
    const result =
      await trackEvent({
        visitorId:
          req.body?.visitorId ||
          req.headers["x-visitor-id"] ||
          "",

        sessionId:
          req.body?.sessionId ||
          req.headers["x-session-id"] ||
          null,

        user:
          req.user || null,

        event:
          req.body?.event,

        eventLabel:
          req.body?.eventLabel || "",

        path:
          req.body?.path || "",

        pageViewId:
          req.body?.pageViewId || null,

        business:
          req.body?.business || null,

        category:
          req.body?.category || null,

        city:
          req.body?.city || null,

        query:
          req.body?.query || "",

        metadata:
          req.body?.metadata || {},

        source:
          req.body?.source || "unknown",

        deviceType:
          req.body?.deviceType || "",

        browser:
          req.body?.browser || "",

        operatingSystem:
          req.body?.operatingSystem || "",

        country:
          req.body?.country || "",

        state:
          req.body?.state || "",

        cityName:
          req.body?.cityName || "",

        entryPage:
          req.body?.entryPage || "",

        landingPage:
          req.body?.landingPage || "",
      });

    return res.status(
      result?.success ? 200 : 400
    ).json(result);
  });

/**
 * =========================================================
 * TRACK BUSINESS ACTION
 * =========================================================
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
export const trackBusinessActionController =
  asyncHandler(async (req, res) => {
    const result =
      await trackBusinessAction({
        action:
          req.body?.action,

        visitorId:
          req.body?.visitorId ||
          req.headers["x-visitor-id"] ||
          "",

        sessionId:
          req.body?.sessionId ||
          req.headers["x-session-id"] ||
          null,

        user:
          req.user || null,

        business:
          req.body?.business || null,

        path:
          req.body?.path || "",

        pageViewId:
          req.body?.pageViewId || null,

        metadata:
          req.body?.metadata || {},

        source:
          req.body?.source || "unknown",

        deviceType:
          req.body?.deviceType || "",

        browser:
          req.body?.browser || "",

        operatingSystem:
          req.body?.operatingSystem || "",

        country:
          req.body?.country || "",

        state:
          req.body?.state || "",

        cityName:
          req.body?.cityName || "",
      });

    return res.status(
      result?.success ? 200 : 400
    ).json(result);
  });

/**
 * =========================================================
 * TRACK SEARCH EVENT
 * =========================================================
 */
export const trackSearchEventController =
  asyncHandler(async (req, res) => {
    const result =
      await trackSearchEvent({
        visitorId:
          req.body?.visitorId ||
          req.headers["x-visitor-id"] ||
          "",

        sessionId:
          req.body?.sessionId ||
          req.headers["x-session-id"] ||
          null,

        user:
          req.user || null,

        query:
          req.body?.query || "",

        path:
          req.body?.path || "/search",

        pageViewId:
          req.body?.pageViewId || null,

        category:
          req.body?.category || null,

        city:
          req.body?.city || null,

        resultCount:
          req.body?.resultCount ?? null,

        metadata:
          req.body?.metadata || {},

        source:
          req.body?.source || "unknown",

        deviceType:
          req.body?.deviceType || "",

        browser:
          req.body?.browser || "",

        operatingSystem:
          req.body?.operatingSystem || "",

        country:
          req.body?.country || "",

        state:
          req.body?.state || "",

        cityName:
          req.body?.cityName || "",
      });

    return res.status(
      result?.success ? 200 : 400
    ).json(result);
  });

/**
 * =========================================================
 * TRACK AUTH EVENT
 * =========================================================
 */
export const trackAuthEventController =
  asyncHandler(async (req, res) => {
    const result =
      await trackAuthEvent({
        event:
          req.body?.event,

        visitorId:
          req.body?.visitorId ||
          req.headers["x-visitor-id"] ||
          "",

        sessionId:
          req.body?.sessionId ||
          req.headers["x-session-id"] ||
          null,

        user:
          req.user || null,

        path:
          req.body?.path || "",

        metadata:
          req.body?.metadata || {},

        source:
          req.body?.source || "unknown",

        deviceType:
          req.body?.deviceType || "",

        browser:
          req.body?.browser || "",

        operatingSystem:
          req.body?.operatingSystem || "",

        country:
          req.body?.country || "",

        state:
          req.body?.state || "",

        cityName:
          req.body?.cityName || "",
      });

    return res.status(
      result?.success ? 200 : 400
    ).json(result);
  });

/**
 * =========================================================
 * GET EVENT BY ID
 * =========================================================
 */
export const getEventController =
  asyncHandler(async (req, res) => {
    const event =
      await getEventById(
        req.params?.eventId
      );

    if (!event) {
      return res.status(404).json({
        success: false,
        event: null,
        message:
          "Event was not found.",
      });
    }

    return res.json({
      success: true,
      event,
    });
  });

/**
 * =========================================================
 * GET SESSION EVENTS
 * =========================================================
 */
export const getSessionEventsController =
  asyncHandler(async (req, res) => {
    const events =
      await getSessionEvents(
        req.params?.sessionId
      );

    return res.json({
      success: true,
      events,
    });
  });