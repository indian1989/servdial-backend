// backend/routes/notificationRoutes.js

import express from "express";

import {
  getMyNotifications,
  getAllNotifications,
  createNotification,
  createBulkNotifications,
  createBulkNotificationsByRole,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteMyNotification,
  deleteBulkMyNotifications,
  deleteBulkNotifications,
} from "../controllers/notificationController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/* ======================================================
   SECURITY
====================================================== */

router.use(protect);


/* ======================================================
   MY NOTIFICATIONS
   USER / PROVIDER / ADMIN / SUPERADMIN
====================================================== */

/* GET MY NOTIFICATIONS */

router.get(
  "/my",
  authorizeRoles(
    "user",
    "provider",
    "admin",
    "superadmin"
  ),
  getMyNotifications
);


/* ======================================================
   MARK SINGLE AS READ
====================================================== */

router.patch(
  "/:id/read",
  authorizeRoles(
    "user",
    "provider",
    "admin",
    "superadmin"
  ),
  markNotificationAsRead
);


/* ======================================================
   MARK ALL MY NOTIFICATIONS AS READ
====================================================== */

router.patch(
  "/read-all",
  authorizeRoles(
    "user",
    "provider",
    "admin",
    "superadmin"
  ),
  markAllNotificationsAsRead
);


/* ======================================================
   DELETE SINGLE MY NOTIFICATION
====================================================== */

router.delete(
  "/:id",
  authorizeRoles(
    "user",
    "provider",
    "admin",
    "superadmin"
  ),
  deleteMyNotification
);


/* ======================================================
   BULK DELETE MY NOTIFICATIONS
====================================================== */

router.delete(
  "/bulk",
  authorizeRoles(
    "user",
    "provider",
    "admin",
    "superadmin"
  ),
  deleteBulkMyNotifications
);


/* ======================================================
   ADMIN — GET ALL NOTIFICATIONS
   ADMIN / SUPERADMIN
====================================================== */

router.get(
  "/admin/all",
  authorizeRoles(
    "admin",
    "superadmin"
  ),
  getAllNotifications
);


/* ======================================================
   ADMIN — CREATE SINGLE NOTIFICATION
====================================================== */

router.post(
  "/admin",
  authorizeRoles(
    "admin",
    "superadmin"
  ),
  createNotification
);


/* ======================================================
   ADMIN — BULK CREATE BY USER IDS
====================================================== */

router.post(
  "/admin/bulk",
  authorizeRoles(
    "admin",
    "superadmin"
  ),
  createBulkNotifications
);


/* ======================================================
   ADMIN — BULK CREATE BY ROLE
====================================================== */

router.post(
  "/admin/bulk-role",
  authorizeRoles(
    "admin",
    "superadmin"
  ),
  createBulkNotificationsByRole
);


/* ======================================================
   ADMIN — BULK DELETE
====================================================== */

router.delete(
  "/admin/bulk",
  authorizeRoles(
    "admin",
    "superadmin"
  ),
  deleteBulkNotifications
);


export default router;