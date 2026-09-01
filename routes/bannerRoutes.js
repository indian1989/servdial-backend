// backend/routes/bannerRoutes.js

import express from "express";

import {
  createBanner,
  getBanners,
  trackBannerClick,
} from "../controllers/bannerController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";


const router = express.Router();


// =====================================================
// PUBLIC BANNER ROUTES
// =====================================================

// Get approved + active banners
router.get(
  "/",
  getBanners
);


// =====================================================
// PUBLIC BANNER CLICK TRACKING
// =====================================================

// Visitors do not need login
router.post(
  "/:bannerId/click",
  trackBannerClick
);


// =====================================================
// CREATE BANNER
// =====================================================

// Admin / Superadmin / Provider / User
router.post(
  "/",
  protect,
  authorizeRoles(
  "user",
  "admin",
  "superadmin",
  "provider"
),
  createBanner
);


export default router;