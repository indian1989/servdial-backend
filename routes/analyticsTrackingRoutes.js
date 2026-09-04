import express from "express";

import { optionalAuth } from "../middleware/authMiddleware.js";

import {
  trackVisitorController,
  getVisitorController,
  touchVisitorController,
} from "../controllers/analytics/visitorTrackingController.js";

import {
  trackPageViewController,
  updatePageViewDurationController,
  getPageViewController,
  getSessionPageViewsController,
} from "../controllers/analytics/pageViewTrackingController.js";

import {
  trackEventController,
  trackBusinessActionController,
  trackSearchEventController,
  trackAuthEventController,
  getEventController,
  getSessionEventsController,
} from "../controllers/analytics/eventTrackingController.js";

const router = express.Router();

/**
 * =========================================================
 * 👤 VISITOR ANALYTICS TRACKING ROUTES
 * =========================================================
 *
 * Public tracking routes.
 *
 * Guest:
 * - allowed
 * - visitorId comes from client
 *
 * Logged-in:
 * - optionalAuth attaches req.user
 * - user/provider association is handled by controller/service
 *
 * =========================================================
 */

/**
 * Create / identify / update visitor
 *
 * POST /api/analytics/visitor
 */
router.post(
  "/visitor",
  optionalAuth,
  trackVisitorController
);

/**
 * Lightweight visitor activity update
 *
 * POST /api/analytics/visitor/touch
 */
router.post(
  "/visitor/touch",
  optionalAuth,
  touchVisitorController
);

/**
 * Get visitor information
 *
 * GET /api/analytics/visitor/:visitorId
 *
 * Kept public for now because visitorId itself is the
 * lookup key. Sensitive/admin analytics must NOT be exposed
 * through this route.
 */
router.get(
  "/visitor/:visitorId",
  getVisitorController
);

router.post(
  "/page-view",
  optionalAuth,
  trackPageViewController
);

router.patch(
  "/page-view/:pageViewId/duration",
  optionalAuth,
  updatePageViewDurationController
);

router.get(
  "/page-view/:pageViewId",
  getPageViewController
);


router.get(
  "/session/:sessionId/page-views",
  getSessionPageViewsController
);

/**
 * =========================================================
 * EVENT TRACKING
 * =========================================================
 */

router.post(
  "/event",
  optionalAuth,
  trackEventController
);

router.post(
  "/business-action",
  optionalAuth,
  trackBusinessActionController
);

router.post(
  "/search-event",
  optionalAuth,
  trackSearchEventController
);

router.post(
  "/auth-event",
  optionalAuth,
  trackAuthEventController
);

router.get(
  "/event/:eventId",
  getEventController
);

router.get(
  "/session/:sessionId/events",
  getSessionEventsController
);

export default router;