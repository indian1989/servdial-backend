import express from "express";
import {
  markAsFeatured,
  getFeaturedBusinesses,
} from "../controllers/featuredController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getFeaturedBusinesses);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  markAsFeatured
);

export default router;
