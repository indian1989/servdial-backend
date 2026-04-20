// backend/routes/adminRoutes.js
import express from "express";
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import User from "../models/User.js";
import City from "../models/City.js";
import Category from "../models/Category.js";
import SystemSettings from "../models/SystemSettings.js";
import ActivityLogs from "../models/ActivityLogs.js";
import Business from "../models/Business.js";
import {
  addCity,
  getCities,
  deleteCity
} from "../controllers/cityController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// ================= DASHBOARD STATS =================
router.get(
  "/dashboard",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalAdmins = await User.countDocuments({ role: "admin" });
    const totalCities = await City.countDocuments();
    const totalCategories = await Category.countDocuments();

    res.json({
      success: true,
      stats: {
        users: totalUsers,
        admins: totalAdmins,
        cities: totalCities,
        categories: totalCategories,
      },
    });
  })
);

// ================= ADMINS =================
router.post(
  "/admins",
  protect,
  authorizeRoles("superadmin"),
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      throw new Error("Name, email and password are required");

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw new Error("User with this email already exists");

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

router.get(
  "/admins",
  protect,
  authorizeRoles("superadmin"),
  asyncHandler(async (req, res) => {
    const admins = await User.find({ role: "admin" }).select("-password");
    res.json({ success: true, admins });
  })
);

// ================= USERS =================
router.get(
  "/users",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {
    const users = await User.find({ role: "user" }).select("-password");
    res.json({ success: true, users });
  })
);

// ================= CITIES =================
router.post("/cities", protect, authorizeRoles("admin","superadmin"), addCity);

router.get("/cities", protect, authorizeRoles("admin","superadmin"), getCities);

router.delete("/cities/:id", protect, authorizeRoles("admin","superadmin"), deleteCity);

// ================= CATEGORIES =================

// CREATE CATEGORY WITH LOWERCASE + PARENT
router.post(
  "/categories",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {
    let { name, parentCategory } = req.body;

    if (!name) throw new Error("Category name is required");

    name = name.trim().toLowerCase(); // lowercase for duplicates

    const exists = await Category.findOne({ name });
    if (exists) throw new Error("This category already exists");

    const category = await Category.create({
      name,
      parentCategory: parentCategory || null,
    });

    res.status(201).json({ success: true, category });
  })
);

// GET ALL CATEGORIES (TREE + FLAT WITH PARENT NAME)
router.get(
  "/categories",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {
    const categories = await Category.find().lean().sort({ name: 1 });

    // Build tree (optional, for new UI)
    const map = {};
    const roots = [];
    categories.forEach((cat) => {
      map[cat._id] = { ...cat, children: [] };
    });
    categories.forEach((cat) => {
      if (cat.parentCategory) {
        map[cat.parentCategory]?.children.push(map[cat._id]);
      } else {
        roots.push(map[cat._id]);
      }
    });

    // Build flatCategories with parentCategoryName
    const flatCategories = categories.map((cat) => {
      const parent = categories.find((c) => c._id.toString() === (cat.parentCategory || "").toString());
      return { ...cat, parentCategoryName: parent ? parent.name : null };
    });

    res.json({
      success: true,
      categories: roots,       // Tree structure (optional)
      flatCategories,          // ✅ Flat list with parentCategoryName
    });
  })
);

// DELETE CATEGORY (SAFE)
router.delete(
  "/categories/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) throw new Error("Category not found");

    const hasChild = await Category.findOne({ parentCategory: req.params.id });
    if (hasChild) throw new Error("Cannot delete parent category with subcategories");

    await category.deleteOne();
    res.json({ success: true, message: "Category deleted successfully" });
  })
);

// ================= CHANGE PASSWORD =================
router.put(
  "/change-password",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");
    if (!user) throw new Error("User not found");

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isMatch) throw new Error("Current password is incorrect");

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  })
);

// ================= ANALYTICS =================
router.get(
  "/analytics",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalBusinesses = await Business.countDocuments();
    const totalOrders = 0;

    res.json({ totalUsers, totalBusinesses, totalOrders });
  })
);

// ================= REPORTS =================
router.get(
  "/reports",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {
    const businesses = await Business.find().populate("categoryId")
.populate("city");
    res.json({ businesses });
  })
);

// ================= SYSTEM SETTINGS =================
router.get(
  "/system-settings",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {
    const settings = await SystemSettings.find();
    res.json({ settings });
  })
);

// ================= ACTIVITY LOGS =================
router.get(
  "/activity-logs",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {
    const logs = await ActivityLogs.find()
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ logs });
  })
);

export default router;