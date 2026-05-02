import express from "express";

import {
  getAllCategories,
  getCategoryWithChildren,
  getCategoryBySlug,
  getTrendingCategories,
} from "../controllers/categoryController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/* ================= PUBLIC ================= */

router.get("/trending", getTrendingCategories);

router.get("/:slug/children", getCategoryWithChildren);

router.get("/:slug", getCategoryBySlug);

router.get("/", getAllCategories);

export default router;