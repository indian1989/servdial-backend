import express from "express";
import {
  getCategories,
  getTrendingCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

const router = express.Router();

// PUBLIC
router.get("/", getCategories);
router.get("/trending", getTrendingCategories);
router.get("/slug/:slug", getCategoryBySlug);

// ADMIN
router.post("/", createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;