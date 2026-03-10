import express from "express";
import {
  createBanner,
  getBanners,
  deleteBanner,
} from "../controllers/bannerController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getBanners);

router.post(
  "/",
  protect,
  authorizeRoles("admin", "superadmin"),
  createBanner
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  deleteBanner
);

export default router;