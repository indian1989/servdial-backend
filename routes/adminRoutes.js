// backend/routes/adminRoutes.js

import express from "express";

import {
  getDashboardStats,
  getAnalytics,
  getSystemSettings,
  getActivityLogs,
  changePassword,
  getAdmins,
  getUsers,
} from "../controllers/adminController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/* ======================================================
   SECURITY LAYER
====================================================== */
router.use(protect);
router.use(authorizeRoles("admin", "superadmin"));

/* ======================================================
   DASHBOARD
====================================================== */
router.get("/dashboard", getDashboardStats);

/* ======================================================
   ANALYTICS
====================================================== */
router.get("/analytics", getAnalytics);

/* ======================================================
   USERS (ADMIN + SUPERADMIN)
====================================================== */
router.get("/users", getUsers);

/* ======================================================
   ADMINS (SUPERADMIN ONLY)
====================================================== */
router.get(
  "/admins",
  authorizeRoles("superadmin"),
  getAdmins
);

/* ======================================================
   ACCOUNT MANAGEMENT
====================================================== */
router.put("/change-password", changePassword);

/* ======================================================
   SYSTEM SETTINGS
====================================================== */
router.get("/system-settings", getSystemSettings);

/* ======================================================
   ACTIVITY LOGS
====================================================== */
router.get("/activity-logs", getActivityLogs);

export default router;