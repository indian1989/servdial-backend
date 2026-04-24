// backend/routes/categoryRoutes.js

import express from "express";
import {
  getAllCategories,
  getCategoryWithChildren,
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

// 🔥 Trending (must come before dynamic routes)
router.get("/trending", getTrendingCategories);

router.get("/:slug/children", getCategoryWithChildren);
// 🔥 Get by slug (SEO standard)
router.get("/:slug", getCategoryBySlug);

// 🔥 Get flat categories (with parent filter)
router.get("/", getAllCategories);

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

// Delete category (soft delete)
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  deleteCategory
);

export default router;