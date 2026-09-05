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
  req,
  visitorId,
  sessionId,
  path,
  pageTitle,
  pageType,
  businessId: businessId || null,
  categoryId: categoryId || null,
  cityId: cityId || null,
  query: query || "",
  referrer,
  source,
  utmSource,
  utmMedium,
  utmCampaign,
  utmTerm,
  utmContent,
  context,
  user: req.user || null,
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

    if (!result?.success) {
      return res.status(400).json({
        success: false,
        message:
          result?.message ||
          "Unable to update page view duration.",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.pageView || result,
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