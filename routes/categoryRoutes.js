// backend/routes/categoryRoutes.js

import express from "express";
import {
  getAllCategories,
  getCategoryBySlug,
  getTrendingCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/* ================= PUBLIC ================= */

// Flat + tree (already included in controller)
router.get("/", getAllCategories);

// Trending categories
router.get("/trending", getTrendingCategories);

// Better REST naming (cleaner)
router.get("/by-slug/:slug", getCategoryBySlug);

/* ================= ADMIN ================= */

// Create category (admin only)
router.post(
  "/",
  protect,
  authorizeRoles("admin", "superadmin"),
  createCategory
);

// Update category
router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  updateCategory
);

// Delete category
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  deleteCategory
);

export default router;