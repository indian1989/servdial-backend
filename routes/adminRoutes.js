// backend/routes/adminRoutes.js

import express from "express";

import {
  getDashboardStats,
  getAnalytics,
  getVisitorAnalytics,
  getSearchAnalytics,
  getSystemSettings,
  updateSystemSettings,
  getActivityLogs,
  changePassword,
  getAdmins,
  getUsers,
  deleteUser,
  updateAdminLeadStatus,
  updateAdminLeadNotes,
} from "../controllers/adminController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import {
  getBusinessFunnelAnalytics,
} from "../controllers/analytics/businessFunnelAnalyticsController.js";

import {
  getVisitorJourneyAnalytics,
} from "../controllers/analytics/visitorJourneyAnalyticsController.js";

import {
  getAcquisitionAnalytics,
} from "../controllers/analytics/acquisitionAnalyticsController.js";


const router = express.Router();

/* ======================================================
   SECURITY LAYER
====================================================== */

router.use(protect);

router.use(
  authorizeRoles("admin", "superadmin")
);


/* ======================================================
   DASHBOARD
====================================================== */

router.get(
  "/dashboard",
  getDashboardStats
);


/* ======================================================
   ANALYTICS
====================================================== */

router.get(
  "/analytics",
  getAnalytics
);

router.get(
  "/visitor-analytics",
  getVisitorAnalytics
);

router.get(
  "/search-analytics",
  getSearchAnalytics
);

router.get(
  "/business-funnel-analytics",
  getBusinessFunnelAnalytics
);

router.get(
  "/visitor-journey-analytics",
  getVisitorJourneyAnalytics
);

router.get(
  "/acquisition-analytics",
  getAcquisitionAnalytics
);


/* ======================================================
   USERS
====================================================== */

router.get(
  "/users",
  getUsers
);

router.delete(
  "/users/:id",
  deleteUser
);


/* ======================================================
   ADMINS
   SUPERADMIN ONLY
====================================================== */

router.get(
  "/admins",
  authorizeRoles("superadmin"),
  getAdmins
);


/* ======================================================
   LEADS
   ADMIN + SUPERADMIN
====================================================== */

// Update lead status
router.put(
  "/leads/:id/status",
  updateAdminLeadStatus
);

// Update lead notes
router.put(
  "/leads/:id/notes",
  updateAdminLeadNotes
);


/* ======================================================
   ACCOUNT MANAGEMENT
====================================================== */

router.put(
  "/change-password",
  changePassword
);


/* ======================================================
   SYSTEM SETTINGS
====================================================== */

router.get(
  "/system-settings",
  getSystemSettings
);

router.put(
  "/system-settings",
  updateSystemSettings
);


/* ======================================================
   ACTIVITY LOGS
====================================================== */

router.get(
  "/activity-logs",
  getActivityLogs
);


export default router;