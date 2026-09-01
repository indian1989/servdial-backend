// backend/routes/providerRoutes.js

import express from "express";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

import {
  getProviderDashboardStats,
  getProviderBusinesses,
  getProviderBusinessById,
  getProviderLeads,
  updateProviderLeadStatus,
  updateProviderLeadNotes,
  closeProviderLead,
  cancelProviderLead,
  getProviderReviews,
  getProviderAnalytics,
  getProviderSettings,
  getProviderMessages,
  getProviderNotifications,
  getProviderOffers,
  getProviderProfile,
  getProviderSubscription,
} from "../controllers/providerController.js";

import {
  createBusiness,
  updateBusiness,
  claimBusiness,
  updateBusinessHours,
  updateBusinessMedia,
} from "../controllers/businessController.js";

import {
  getProviderBanners,
  updateProviderBanner,
  deleteProviderBanner,
} from "../controllers/bannerController.js";

const router = express.Router();

/* ================= SECURITY ================= */

router.use(protect);

router.use(authorizeRoles("provider"));

/* ================= PROVIDER DASHBOARD ================= */

router.get(
  "/dashboard",
  getProviderDashboardStats
);

/* ================= BUSINESSES ================= */

router.get(
  "/businesses",
  getProviderBusinesses
);

router.get(
  "/businesses/:id",
  getProviderBusinessById
);

router.post(
  "/businesses",
  createBusiness
);

router.put(
  "/businesses/:id",
  updateBusiness
);

router.post(
  "/businesses/claim",
  claimBusiness
);

router.put(
  "/businesses/:id/hours",
  updateBusinessHours
);

router.put(
  "/businesses/:id/media",
  updateBusinessMedia
);

/* ================= LEADS & REVIEWS ================= */

router.get(
  "/leads",
  getProviderLeads
);

router.put(
  "/leads/:id/status",
  updateProviderLeadStatus
);

router.put(
  "/leads/:id/notes",
  updateProviderLeadNotes
);

router.put(
  "/leads/:id/close",
  closeProviderLead
);

router.put(
  "/leads/:id/cancel",
  cancelProviderLead
);

router.get(
  "/reviews",
  getProviderReviews
);

/* ================= ANALYTICS ================= */

router.get(
  "/analytics",
  getProviderAnalytics
);

/* ================= SETTINGS / PROFILE ================= */

router.get(
  "/settings",
  getProviderSettings
);

router.get(
  "/profile",
  getProviderProfile
);

/* ================= MESSAGES / NOTIFICATIONS / OFFERS ================= */

router.get(
  "/messages",
  getProviderMessages
);

router.get(
  "/notifications",
  getProviderNotifications
);

router.get(
  "/offers",
  getProviderOffers
);

/* ================= SUBSCRIPTION ================= */

router.get(
  "/subscription",
  getProviderSubscription
);

/* ================= PROVIDER BANNER ADS ================= */

/*
  Banner creation is intentionally NOT here.

  Provider creates a banner through:
  POST /banners
  -> createBanner()

  These routes are only for managing
  the provider's own banners.
*/

router.get(
  "/banners",
  getProviderBanners
);

router.put(
  "/banners/:bannerId",
  updateProviderBanner
);

router.delete(
  "/banners/:bannerId",
  deleteProviderBanner
);

export default router;