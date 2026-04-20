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

// router.use(protect);
// router.use(authorizeRoles("admin", "superadmin"));

router.get("/", getAllBanners);
router.put("/:bannerId", updateBanner);
router.delete("/:bannerId", deleteBanner);
router.put("/:bannerId/approve", approveBanner);
router.put("/:bannerId/reject", rejectBanner);
router.put("/:bannerId/payment", markBannerPaid);

export default router;