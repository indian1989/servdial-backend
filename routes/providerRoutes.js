// backend/routes/providerRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js"; // assuming you have auth middleware
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

// ================= PROVIDER DASHBOARD =================
router.get("/dashboard", protect, getProviderDashboardStats);

// ================= BUSINESSES =================
router.get("/businesses", protect, getProviderBusinesses);
router.post("/businesses", protect, createBusiness);
router.put("/businesses/:id", protect, updateBusiness);
router.post("/businesses/claim", protect, claimBusiness);
router.put("/businesses/:id/hours", protect, updateBusinessHours);
router.put("/businesses/:id/media", protect, updateBusinessMedia);

// ================= LEADS & REVIEWS =================
router.get("/leads", protect, getProviderLeads);
router.get("/reviews", protect, getProviderReviews);

// ================= ANALYTICS =================
router.get("/analytics", protect, getProviderAnalytics);

// ================= SETTINGS / PROFILE =================
router.get("/settings", protect, getProviderSettings);
router.get("/profile", protect, getProviderProfile);

// ================= MESSAGES / NOTIFICATIONS / OFFERS =================
router.get("/messages", protect, getProviderMessages);
router.get("/notifications", protect, getProviderNotifications);
router.get("/offers", protect, getProviderOffers);

// ================= SUBSCRIPTION =================
router.get("/subscription", protect, getProviderSubscription);

// ================= TRACK BUSINESS VIEWS =================
router.post("/businesses/:id/track-view", protect, trackBusinessView);

export default router;