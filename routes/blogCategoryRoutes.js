// Path: backend/routes/blogCategoryRoutes.js

import express from "express";

import {
  createBlogCategory,
  getAllBlogCategories,
  getActiveBlogCategories,
  getBlogCategoryById,
  updateBlogCategory,
  deleteBlogCategory,
} from "../controllers/blogCategoryController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();


/*
=================================================
 ADMIN BLOG CATEGORY ROUTES
=================================================
*/

// All categories
router.get(
  "/admin",
  protect,
  authorizeRoles("admin", "superadmin"),
  getAllBlogCategories
);

// Single category by ID
router.get(
  "/admin/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  getBlogCategoryById
);

// Create category
router.post(
  "/",
  protect,
  authorizeRoles("admin", "superadmin"),
  createBlogCategory
);

// Update category
router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  updateBlogCategory
);

// Delete category
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  deleteBlogCategory
);


/*
=================================================
 PUBLIC BLOG CATEGORY ROUTES
=================================================
*/

// Active categories only
router.get(
  "/",
  getActiveBlogCategories
);


export default router;