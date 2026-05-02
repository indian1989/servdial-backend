import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

import {
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,   // 👈 ADD THIS
} from "../controllers/categoryController.js";

const router = express.Router();

// 🔒 lock admin access
router.use(protect);
router.use(authorizeRoles("admin", "superadmin"));

/* ================= ADMIN CATEGORY ROUTES ================= */

// 🔥 THIS WAS MISSING (causing 404)
router.get("/", getAllCategories);

// CRUD
router.post("/", createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;