import express from "express";
import {
  createBanner,
  getBanners,
  deleteBanner,
} from "../controllers/bannerController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getBanners);

router.post(
  "/",
  protect,
  authorize("admin", "superadmin"),
  createBanner
);

router.delete(
  "/:id",
  protect,
  authorize("admin", "superadmin"),
  deleteBanner
);

export default router;