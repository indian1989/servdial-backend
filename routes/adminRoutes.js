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

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ================= SECURITY ================= */
router.use(protect);
router.use(authorizeRoles("admin", "superadmin"));

/* ================= DASHBOARD ================= */
router.get("/dashboard", getDashboardStats);

/* ================= ADMIN USERS (SUPERADMIN ONLY) ================= */
router.get("/admins", authorizeRoles("superadmin"), getAdmins);

router.get(
  "/users", getUsers);

/* ================= ACCOUNT ================= */
router.put("/change-password", changePassword);

/* ================= ANALYTICS ================= */
router.get("/analytics", getAnalytics);

/* ================= SYSTEM ================= */
router.get("/system-settings", getSystemSettings);

/* ================= LOGS ================= */
router.get("/activity-logs", getActivityLogs);

export default router;