// backend/routes/adminRoutes.js
import express from "express";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import City from "../models/City.js";
import Category from "../models/Category.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// ================= Create Admin =================
router.post(
  "/create-admin",
  protect,
  authorizeRoles("superadmin"),
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error("Name, email, and password are required");
    }

    const existing = await User.findOne({ email });
    if (existing) {
      res.status(400);
      throw new Error("User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "admin",
      isVerified: true,
      isActive: true,
    });

    res.status(201).json({ success: true, admin });
  })
);

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

// ================= Change Password =================
router.put(
  "/change-password",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(400);
      throw new Error("Current password is incorrect");
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ success: true, message: "Password updated successfully" });
  })
);
export default router;