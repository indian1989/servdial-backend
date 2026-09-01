// backend/routes/paymentRoutes.js

import express from "express";

import {
  getPaymentSettings,
  createPayment,
  submitPaymentProof,
  getMyPayments,
  getPaymentById,
  getAllPayments,
  verifyPayment,
  rejectPayment,
  refundPayment,
  cancelPayment,
} from "../controllers/paymentController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";


const router = express.Router();


// =====================================================
// PAYMENT SETTINGS
// =====================================================

// User / Provider can view active payment instructions

router.get(
  "/settings",
  protect,
  authorizeRoles(
    "user",
    "provider"
  ),
  getPaymentSettings
);


// =====================================================
// CREATE PAYMENT
// =====================================================

// User / Provider can create payment

router.post(
  "/",
  protect,
  authorizeRoles(
    "user",
    "provider"
  ),
  createPayment
);


// =====================================================
// MY PAYMENTS
// =====================================================

// User / Provider can view their own payments

router.get(
  "/my",
  protect,
  authorizeRoles(
    "user",
    "provider"
  ),
  getMyPayments
);


// =====================================================
// SUBMIT PAYMENT PROOF
// =====================================================

// User / Provider can submit proof for their own payment

router.post(
  "/:id/proof",
  protect,
  authorizeRoles(
    "user",
    "provider"
  ),
  submitPaymentProof
);


// =====================================================
// ADMIN — GET ALL PAYMENTS
// =====================================================

// Admin / Superadmin only

router.get(
  "/admin/all",
  protect,
  authorizeRoles(
    "admin",
    "superadmin"
  ),
  getAllPayments
);


// =====================================================
// ADMIN — VERIFY PAYMENT
// =====================================================

// Admin / Superadmin only

router.patch(
  "/admin/:id/verify",
  protect,
  authorizeRoles(
    "admin",
    "superadmin"
  ),
  verifyPayment
);


// =====================================================
// ADMIN — REJECT PAYMENT
// =====================================================

// Admin / Superadmin only

router.patch(
  "/admin/:id/reject",
  protect,
  authorizeRoles(
    "admin",
    "superadmin"
  ),
  rejectPayment
);


// =====================================================
// ADMIN — REFUND PAYMENT
// =====================================================

// Admin / Superadmin only

router.patch(
  "/admin/:id/refund",
  protect,
  authorizeRoles(
    "admin",
    "superadmin"
  ),
  refundPayment
);


// =====================================================
// ADMIN — CANCEL PAYMENT
// =====================================================

// Admin / Superadmin only

router.patch(
  "/admin/:id/cancel",
  protect,
  authorizeRoles(
    "admin",
    "superadmin"
  ),
  cancelPayment
);


// =====================================================
// GET SINGLE PAYMENT
// =====================================================

// User / Provider can view their own payment.
// Admin / Superadmin can view any payment.

router.get(
  "/:id",
  protect,
  authorizeRoles(
    "user",
    "provider",
    "admin",
    "superadmin"
  ),
  getPaymentById
);


export default router;