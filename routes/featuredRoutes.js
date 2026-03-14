import express from "express";
import {
  markAsFeatured,
  getFeaturedBusinesses,
} from "../controllers/featuredController.js";

import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================
   PUBLIC - GET FEATURED
========================= */
router.get("/", getFeaturedBusinesses);

/* =========================
   ADMIN / SUPERADMIN
   MARK BUSINESS AS FEATURED
========================= */
router.put(
  "/:id",
  protect,
  authorize("admin", "superadmin"),
  markAsFeatured
);

export default router;