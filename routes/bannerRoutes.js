// backend/routes/bannerRoutes.js
import express from "express";
import {
  createBanner,
  getBanners,
} from "../controllers/bannerController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// ===============================
// PUBLIC + CREATION BANNER ROUTES
// RULES:
// - GET is public (only approved + active banners)
// - POST is protected (admin/provider only)
// - NO update/delete here (admin only module)
// ===============================
router.get("/", getBanners);

router.post(
  "/",
  protect,
  authorizeRoles("admin", "superadmin", "provider"),
  createBanner
);

export default router;