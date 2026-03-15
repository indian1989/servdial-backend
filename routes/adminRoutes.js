// backend/routes/adminRoutes.js

import express from "express";
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import City from "../models/City.js";
import Category from "../models/Category.js";
import { createBusiness } from "../controllers/adminController.js";
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
        categories: totalCategories
      }
    });

  })
);

router.post("/admin/business", createBusiness);
router.put("/admin/business/feature/:id", toggleFeatured);


// ================= CREATE ADMIN (SUPERADMIN) =================
router.post(
  "/create-admin",
  protect,
  authorizeRoles("superadmin"),
  asyncHandler(async (req, res) => {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error("Name, email and password are required");
    }

    const existing = await User.findOne({ email: email.toLowerCase() });

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
      isActive: true
    });

    res.status(201).json({
      success: true,
      admin
    });

  })
);


// ================= GET ADMINS (SUPERADMIN) =================
router.get(
  "/admins",
  protect,
  authorizeRoles("superadmin"),
  asyncHandler(async (req, res) => {

    const admins = await User.find({ role: "admin" }).select("-password");

    res.json({
      success: true,
      admins
    });

  })
);


// ================= GET USERS =================
router.get(
  "/users",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {

    const users = await User.find({ role: "user" }).select("-password");

    res.json({
      success: true,
      users
    });

  })
);


// ================= ADD CITY =================
router.post(
  "/city",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {

    let { name, state } = req.body;

    if (!name || !state) {
      res.status(400);
      throw new Error("City name and state are required");
    }

    const exists = await City.findOne({
  name: { $regex: `^${name}$`, $options: "i" },
  state: { $regex: `^${state}$`, $options: "i" }
});

    if (exists) {
      res.status(400);
      throw new Error("This city already exists in this state");
    }

    const city = await City.create({ name, state });

    res.status(201).json({
      success: true,
      city
    });

  })
);


// ================= GET CITIES =================
router.get(
  "/cities",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {

    const cities = await City.find().sort({ name: 1 });

    res.json({
      success: true,
      cities
    });

  })
);


// ================= DELETE CITY =================
router.delete(
  "/city/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {

    const city = await City.findById(req.params.id);

    if (!city) {
      res.status(404);
      throw new Error("City not found");
    }

    await city.deleteOne();

    res.json({
      success: true,
      message: "City deleted successfully"
    });

  })
);


// ================= ADD CATEGORY =================
router.post(
  "/category",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {

    let { name } = req.body;

    if (!name) {
      res.status(400);
      throw new Error("Category name is required");
    }

    name = name.toLowerCase();

    const exists = await Category.findOne({ name });

    if (exists) {
      res.status(400);
      throw new Error("This category already exists");
    }

    const category = await Category.create({ name });

    res.status(201).json({
      success: true,
      category
    });

  })
);


// ================= GET CATEGORIES =================
router.get(
  "/categories",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {

    const categories = await Category.find().sort({ name: 1 });

    res.json({
      success: true,
      categories
    });

  })
);


// ================= DELETE CATEGORY =================
router.delete(
  "/category/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {

    const category = await Category.findById(req.params.id);

    if (!category) {
      res.status(404);
      throw new Error("Category not found");
    }

    await category.deleteOne();

    res.json({
      success: true,
      message: "Category deleted successfully"
    });

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

    res.json({
      success: true,
      message: "Password updated successfully"
    });

  })
);


export default router;