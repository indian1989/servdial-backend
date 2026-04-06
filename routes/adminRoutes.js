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

import { toggleFeatured } from "../controllers/adminController.js";

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

router.put(
  "/business/feature/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  toggleFeatured
);

// ================= ADMINS =================
router.post(
  "/create-admin",
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
router.post(
  "/city",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {
    const { name, state } = req.body;

    if (!name || !state)
      throw new Error("City name and state are required");

    const exists = await City.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
      state: { $regex: `^${state}$`, $options: "i" },
    });

    if (exists) throw new Error("This city already exists in this state");

    const city = await City.create({ name, state });

    res.status(201).json({ success: true, city });
  })
);

router.get(
  "/cities",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {
    const cities = await City.find().sort({ name: 1 });
    res.json({ success: true, cities });
  })
);

router.delete(
  "/city/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {
    const city = await City.findById(req.params.id);
    if (!city) throw new Error("City not found");

    await city.deleteOne();

    res.json({ success: true, message: "City deleted successfully" });
  })
);

// ================= CATEGORIES =================

// CREATE CATEGORY WITH LOWERCASE + PARENT
router.post(
  "/category",
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
  "/category/:id",
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
    const businesses = await Business.find().populate("category city");
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