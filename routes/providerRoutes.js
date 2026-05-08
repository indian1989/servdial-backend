// backend/routes/providerRoutes.js

import express from "express";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

import {
  getProviderDashboardStats,
  getProviderBusinesses,
  getProviderLeads,
  getProviderReviews,
  getProviderAnalytics,
  getProviderSettings,
  getProviderMessages,
  getProviderNotifications,
  getProviderOffers,
  getProviderProfile,
  getProviderSubscription,
  trackBusinessView,
} from "../controllers/providerController.js";

import {
  createBusiness,
  updateBusiness,
  claimBusiness,
  updateBusinessHours,
  updateBusinessMedia,
} from "../controllers/businessController.js";

const router = express.Router();

/* ================= SECURITY ================= */
router.use(protect);
router.use(authorizeRoles("provider"));

/* ================= PROVIDER DASHBOARD ================= */
router.get("/dashboard", getProviderDashboardStats);

/* ================= BUSINESSES ================= */
router.get("/businesses", getProviderBusinesses);
router.post("/businesses", createBusiness);
router.put("/businesses/:id", updateBusiness);
router.post("/businesses/claim", claimBusiness);
router.put("/businesses/:id/hours", updateBusinessHours);
router.put("/businesses/:id/media", updateBusinessMedia);

/* ================= LEADS & REVIEWS ================= */
router.get("/leads", getProviderLeads);
router.get("/reviews", getProviderReviews);

/* ================= ANALYTICS ================= */
router.get("/analytics", getProviderAnalytics);

/* ================= SETTINGS / PROFILE ================= */
router.get("/settings", getProviderSettings);
router.get("/profile", getProviderProfile);

/* ================= MESSAGES / NOTIFICATIONS / OFFERS ================= */
router.get("/messages", getProviderMessages);
router.get("/notifications", getProviderNotifications);
router.get("/offers", getProviderOffers);

/* ================= SUBSCRIPTION ================= */
router.get("/subscription", getProviderSubscription);

/* ================= TRACK BUSINESS VIEWS ================= */
router.post("/businesses/:id/track-view", trackBusinessView);

export default router;