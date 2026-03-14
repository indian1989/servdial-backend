import express from "express";
import {
  markAsFeatured,
  getFeaturedBusinesses,
} from "../controllers/featuredController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

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
  authorizeRoles("admin", "superadmin"),
  markAsFeatured
);

export default router;