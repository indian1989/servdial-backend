// backend/routes/adminBannerRoutes.js

import express from "express";
import {
  updateBanner,
  deleteBanner,
  approveBanner,
  rejectBanner,
  markBannerPaid,
  getAllBanners
} from "../controllers/bannerController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ================= SECURITY ================= */
router.use(protect);
router.use(authorizeRoles("admin", "superadmin"));

/* ================= LIST ================= */
router.get("/", getAllBanners);

/* ================= ACTIONS (PRIORITY ROUTES) ================= */
router.put("/:bannerId/approve", approveBanner);
router.put("/:bannerId/reject", rejectBanner);
router.put("/:bannerId/payment", markBannerPaid);

/* ================= CRUD ================= */
router.put("/:bannerId", updateBanner);
router.delete("/:bannerId", deleteBanner);

export default router;