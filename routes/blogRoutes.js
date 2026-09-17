// Path: backend/routes/blogRoutes.js

import express from "express";

import {
  createBlog,
  getAllBlogs,
  getPublishedBlogs,
  getBlogBySlug,
  getBlogById,
  updateBlog,
  deleteBlog,
  incrementBlogViews,
  toggleBlogPin,
} from "../controllers/blogController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/*
=================================================
 ADMIN BLOG ROUTES
=================================================
*/

// All blogs including drafts
router.get(
  "/admin",
  protect,
  authorizeRoles("admin", "superadmin"),
  getAllBlogs
);

// Single blog by ID
router.get(
  "/admin/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  getBlogById
);

// Create blog
router.post(
  "/",
  protect,
  authorizeRoles("admin", "superadmin"),
  createBlog
);

// Update blog
router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  updateBlog
);

// Delete blog
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  deleteBlog
);

// ==================== PIN / UNPIN ====================

router.patch(
  "/:id/pin",
  protect,
  authorizeRoles("admin", "superadmin"),
  toggleBlogPin
);

/*
=================================================
 PUBLIC BLOG ROUTES
=================================================
*/

// Blog listing
router.get("/", getPublishedBlogs);

// Increment blog views
router.patch("/:id/views", incrementBlogViews);

// Single published blog
router.get("/:slug", getBlogBySlug);

export default router;