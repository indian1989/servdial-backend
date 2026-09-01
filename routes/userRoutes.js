// backend/routes/userRoutes.js

import express from "express";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

import {
  createAdmin,
  changePassword,
  saveBusiness,
  checkSavedBusiness,
  removeSavedBusiness,
  getSavedBusinesses,
  getUserBanners,
  updateUserBanner,
  deleteUserBanner,
  getUserNotifications,
  getUserMessages,
} from "../controllers/userController.js";

const router = express.Router();

// =====================================================
// CHANGE PASSWORD
// Any authenticated user
// =====================================================

router.put(
  "/change-password",
  protect,
  changePassword
);


// =====================================================
// CREATE ADMIN
// Superadmin only
// =====================================================

router.post(
  "/create-admin",
  protect,
  authorizeRoles("superadmin"),
  createAdmin
);


// =====================================================
// SAVED BUSINESSES
// =====================================================

// Save business
router.post(
  "/save-business",
  protect,
  saveBusiness
);

// Check saved business
router.get(
  "/check-saved/:businessId",
  protect,
  checkSavedBusiness
);

// Remove saved business
router.post(
  "/remove-saved-business",
  protect,
  removeSavedBusiness
);

// Get saved businesses
router.get(
  "/saved-businesses",
  protect,
  getSavedBusinesses
);


// =====================================================
// USER BANNERS
// =====================================================

// Get logged-in user's own banners
router.get(
  "/banners",
  protect,
  authorizeRoles("user"),
  getUserBanners
);

// Update logged-in user's own banner
router.put(
  "/banners/:bannerId",
  protect,
  authorizeRoles("user"),
  updateUserBanner
);

// Delete logged-in user's own banner
router.delete(
  "/banners/:bannerId",
  protect,
  authorizeRoles("user"),
  deleteUserBanner
);


// =====================================================
// USER NOTIFICATIONS
// =====================================================

router.get(
  "/notifications",
  protect,
  getUserNotifications
);


// =====================================================
// USER MESSAGES
// =====================================================

router.get(
  "/messages",
  protect,
  getUserMessages
);


export default router;