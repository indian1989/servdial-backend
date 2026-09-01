// backend/routes/paymentSettingsRoutes.js

import express from "express";

import {
  getActivePaymentSettings,
  getAllPaymentSettings,
  getAdminPaymentSettings,
  createPaymentSettings,
  updatePaymentSettings,
  activatePaymentSettings,
  deactivatePaymentSettings,
  deletePaymentSettings,
} from "../controllers/paymentSettingsController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();


// =====================================================
// ACTIVE PAYMENT SETTINGS
// =====================================================
// User / Provider can view active payment instructions.

router.get(
  "/active",
  protect,
  authorizeRoles(
    "user",
    "provider"
  ),
  getActivePaymentSettings
);


// =====================================================
// ADMIN — GET ALL PAYMENT SETTINGS
// =====================================================
// Admin / Superadmin only.

router.get(
  "/admin/all",
  protect,
  authorizeRoles(
    "admin",
    "superadmin"
  ),
  getAllPaymentSettings
);


// =====================================================
// ADMIN — GET CURRENT ACTIVE SETTINGS
// =====================================================
// Admin / Superadmin only.

router.get(
  "/admin/current",
  protect,
  authorizeRoles(
    "admin",
    "superadmin"
  ),
  getAdminPaymentSettings
);


// =====================================================
// ADMIN — CREATE PAYMENT SETTINGS
// =====================================================
// Admin / Superadmin only.

router.post(
  "/admin",
  protect,
  authorizeRoles(
    "admin",
    "superadmin"
  ),
  createPaymentSettings
);


// =====================================================
// ADMIN — UPDATE PAYMENT SETTINGS
// =====================================================
// Admin / Superadmin only.

router.patch(
  "/admin/:id",
  protect,
  authorizeRoles(
    "admin",
    "superadmin"
  ),
  updatePaymentSettings
);


// =====================================================
// ADMIN — ACTIVATE PAYMENT SETTINGS
// =====================================================
// Admin / Superadmin only.

router.patch(
  "/admin/:id/activate",
  protect,
  authorizeRoles(
    "admin",
    "superadmin"
  ),
  activatePaymentSettings
);


// =====================================================
// ADMIN — DEACTIVATE PAYMENT SETTINGS
// =====================================================
// Admin / Superadmin only.

router.patch(
  "/admin/:id/deactivate",
  protect,
  authorizeRoles(
    "admin",
    "superadmin"
  ),
  deactivatePaymentSettings
);


// =====================================================
// SUPERADMIN — DELETE PAYMENT SETTINGS
// =====================================================
// Only Superadmin can permanently delete
// inactive historical settings.

router.delete(
  "/admin/:id",
  protect,
  authorizeRoles(
    "superadmin"
  ),
  deletePaymentSettings
);


export default router;