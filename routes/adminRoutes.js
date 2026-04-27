// backend/routes/adminRoutes.js
import express from "express";
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import Business from "../models/Business.js";
import SystemSettings from "../models/SystemSettings.js";
import ActivityLogs from "../models/ActivityLogs.js";

import { getDashboardStats } from "../controllers/adminController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// ================= DASHBOARD =================
router.get(
  "/dashboard",
  protect,
  authorizeRoles("admin", "superadmin"),
  getDashboardStats
);

// ================= ADMIN USERS (SUPERADMIN ONLY) =================
router.post(
  "/admins",
  protect,
  authorizeRoles("superadmin"),
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      throw new Error("Name, email and password are required");

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) throw new Error("User already exists");

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

// ================= CHANGE PASSWORD =================
router.put(
  "/change-password",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");
    if (!user) throw new Error("User not found");

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) throw new Error("Current password incorrect");

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: "Password updated" });
  })
);

// ================= ANALYTICS =================
router.get(
  "/analytics",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalProviders = await User.countDocuments({ role: "provider" });
    const totalBusinesses = await Business.countDocuments();

    res.json({
      totalUsers,
      totalProviders,
      totalBusinesses,
    });
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