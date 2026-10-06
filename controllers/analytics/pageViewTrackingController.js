// backend/controllers/analytics/pageViewTrackingController.js

import asyncHandler from "express-async-handler";

import {
  trackPageView,
  updatePageViewDuration,
  getPageViewById,
  getSessionPageViews,
} from "../../services/analytics/pageViewTrackingService.js";

export const trackPageViewController =
  asyncHandler(async (req, res) => {
   const {
  visitorId,
  sessionId,
  path,
  pageTitle,
  pageType,
  businessId,
  categoryId,
  cityId,
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
  durationSeconds = 0,
  entryPage,
  landingPage,
  context = {},
} = req.body || {};

    if (!visitorId) {
      return res.status(400).json({
        success: false,
        message: "Visitor ID is required.",
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required.",
      });
    }

    if (!path) {
      return res.status(400).json({
        success: false,
        message: "Page path is required.",
      });
    }

    const result = await trackPageView({
  visitorId,
  sessionId,

  user: req.user || null,

  userAgent:
    req.get("user-agent") || "",

  path,
  pageTitle,
  pageType,

  business:
    businessId || null,

  category:
    categoryId || null,

  city:
    cityId || null,

  query:
    query || "",

  referrer:
    referrer ||
    req.get("referer") ||
    req.get("referrer") ||
    "",

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

  entryPage,
  landingPage,

  context,
});

    if (!result?.success) {
      return res.status(400).json({
        success: false,
        message:
          result?.message ||
          "Unable to track page view.",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.pageView || result,
    });
  });

export const updatePageViewDurationController =
  asyncHandler(async (req, res) => {
    const pageViewId = String(
      req.params?.pageViewId || ""
    ).trim();

    if (!pageViewId) {
      return res.status(400).json({
        success: false,
        message: "Page view ID is required.",
      });
    }

    const durationSeconds = Number(
      req.body?.durationSeconds
    );

    if (
      !Number.isFinite(durationSeconds) ||
      durationSeconds < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid durationSeconds is required.",
      });
    }

    const result =
  await updatePageViewDuration(
    pageViewId,
    durationSeconds
  );

if (!result) {
  return res.status(404).json({
    success: false,
    message:
      "Page view not found.",
  });
}

return res.status(200).json({
  success: true,
  data: result,
});
  });

export const getPageViewController =
  asyncHandler(async (req, res) => {
    const pageViewId = String(
      req.params?.pageViewId || ""
    ).trim();

    if (!pageViewId) {
      return res.status(400).json({
        success: false,
        message: "Page view ID is required.",
      });
    }

    const pageView =
      await getPageViewById(pageViewId);

    if (!pageView) {
      return res.status(404).json({
        success: false,
        message: "Page view not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: pageView,
    });
  });

export const getSessionPageViewsController =
  asyncHandler(async (req, res) => {
    const sessionId = String(
      req.params?.sessionId || ""
    ).trim();

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required.",
      });
    }

    const pageViews =
      await getSessionPageViews(sessionId);

    return res.status(200).json({
      success: true,
      data: pageViews,
    });
  });

export default {
  trackPageViewController,
  updatePageViewDurationController,
  getPageViewController,
  getSessionPageViewsController,
};