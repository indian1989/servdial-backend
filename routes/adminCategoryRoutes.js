import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

const router = express.Router();

// 🔒 lock admin access
router.use(protect);
router.use(authorizeRoles("admin", "superadmin"));

// admin operations ONLY
router.post("/", createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;