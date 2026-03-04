// backend/routes/adminRoutes.js
import express from "express";
import asyncHandler from "express-async-handler";
import City from "../models/City.js";
import Category from "../models/Category.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// ================= Add City =================
router.post(
  "/city",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {
    const { name, state } = req.body;
    if (!name || !state) throw new Error("City name and state are required");

    // Duplicate check
    const exists = await City.findOne({ name, state });
    if (exists) throw new Error("This city already exists in this state");

    const city = await City.create({ name, state });
    res.status(201).json({ success: true, city });
  })
);

// ================= Add Category =================
router.post(
  "/category",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name) throw new Error("Category name is required");

    const exists = await Category.findOne({ name });
    if (exists) throw new Error("This category already exists");

    const category = await Category.create({ name });
    res.status(201).json({ success: true, category });
  })
);

export default router;