// backend/controllers/analytics/visitorTrackingController.js
import asyncHandler from "express-async-handler";

import {
  trackVisitor,
  getVisitorById,
  touchVisitor,
} from "../../services/analytics/visitorTrackingService.js";

/**
 * =========================================================
 * 👤 VISITOR TRACKING CONTROLLER
 * =========================================================
 *
 * RESPONSIBILITY:
 *
 * - Identify / create visitor
 * - Associate authenticated user/provider
 * - Update visitor activity
 * - Fetch visitor details
 *
 * NOTE:
 * - Visitor identity is NOT based on IP.
 * - Guest visitorId must come from the client.
 * - Session, PageView and Event tracking are handled
 *   by their respective services/controllers.
 * =========================================================
 */

/**
 * =========================================================
 * TRACK VISITOR
 * =========================================================
 *
 * POST /api/analytics/visitor
 *
 * Creates a visitor if it does not exist.
 * Updates existing visitor activity.
 *
 * Supports:
 * - guest
 * - user
 * - provider
 */
export const trackVisitorController = asyncHandler(
  async (req, res) => {
    const result = await trackVisitor({
      req,
      visitorId:
        req.body?.visitorId ||
        req.headers["x-visitor-id"] ||
        null,
      user: req.user || null,
      context: req.body?.context || {},
    });

    if (!result?.success) {
      return res.status(400).json({
        success: false,
        message:
          result?.message ||
          "Unable to track visitor.",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.visitor || result,
    });
  }
);

/**
 * =========================================================
 * GET VISITOR
 * =========================================================
 *
 * GET /api/analytics/visitor/:visitorId
 */
export const getVisitorController = asyncHandler(
  async (req, res) => {
    const visitorId = String(
      req.params?.visitorId || ""
    ).trim();

    if (!visitorId) {
      return res.status(400).json({
        success: false,
        message: "Visitor ID is required.",
      });
    }

    const visitor = await getVisitorById(
      visitorId
    );

    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: "Visitor not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: visitor,
    });
  }
);

/**
 * =========================================================
 * TOUCH VISITOR
 * =========================================================
 *
 * POST /api/analytics/visitor/touch
 *
 * Used for lightweight activity updates without
 * creating another visitor record.
 */
export const touchVisitorController =
  asyncHandler(async (req, res) => {
    const visitorId = String(
      req.body?.visitorId ||
        req.headers["x-visitor-id"] ||
        ""
    ).trim();

    if (!visitorId) {
      return res.status(400).json({
        success: false,
        message: "Visitor ID is required.",
      });
    }

    const result = await touchVisitor(
      visitorId,
      req.user || null
    );

    if (!result?.success) {
      return res.status(400).json({
        success: false,
        message:
          result?.message ||
          "Unable to update visitor activity.",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.visitor || result,
    });
  });

export default {
  trackVisitorController,
  getVisitorController,
  touchVisitorController,
};