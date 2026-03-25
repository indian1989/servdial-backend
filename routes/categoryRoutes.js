import express from "express";
import {
  getAllCategories,
  getCategoryBySlug,
  getTrendingCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

const router = express.Router();

/* ================= PUBLIC ================= */

// All categories (tree + flat)
router.get("/", getAllCategories);

// By slug
router.get("/slug/:slug", getCategoryBySlug);

// Trending
router.get("/trending", getTrendingCategories);


/* ================= ADMIN ================= */

// Create
router.post("/", createCategory);

// Update
router.put("/:id", updateCategory);

// Delete
router.delete("/:id", deleteCategory);

export default router;