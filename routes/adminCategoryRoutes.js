// backend/routes/adminCategoryRoutes.js

import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

import {
  createCategory,
  updateCategory,
  deleteCategory
} from "../controllers/categoryController.js";

const router = express.Router();

// 🔒 Admin protection
router.use(protect);
router.use(authorizeRoles("admin", "superadmin"));

// Admin actions
router.post("/", createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;