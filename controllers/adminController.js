// backend/controllers/adminController.js
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";

import SystemSettings from "../models/SystemSettings.js";
import ActivityLogs from "../models/ActivityLogs.js";
import Business from "../models/Business.js";
import Category from "../models/Category.js";
import City from "../models/City.js";
import User from "../models/User.js";

/* ================================
   GET ADMIN BUSINESSES
================================ */
export const getAdminBusinesses = asyncHandler(async (req, res) => {
  const { status, city, category, search, page = 1, limit = 20 } = req.query;

  const query = {};

  if (status) query.status = status;
  if (city) query.cityId = city;
  if (category) query.categoryId = category;

  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  const businesses = await Business.find(query)
    .populate("owner", "name email role")
    .populate("categoryId", "name")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Business.countDocuments(query);

  res.json({
    success: true,
    data: businesses,
    meta: { total, page: Number(page) }
  });
});

/* ================================
   APPROVE BUSINESS
================================ */
export const approveBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findByIdAndUpdate(
    req.params.id,
    { status: "approved" },
    { new: true }
  );

  res.json({ success: true, data: business });
});

/* ================================
   REJECT BUSINESS
================================ */
export const rejectBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findByIdAndUpdate(
    req.params.id,
    { status: "rejected" },
    { new: true }
  );

  res.json({ success: true, data: business });
});

/* ================================
   DELETE BUSINESS
================================ */
export const deleteBusiness = asyncHandler(async (req, res) => {
  await Business.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});


/* ================================
   TOGGLE FEATURED
================================ */
export const toggleFeatured = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  business.isFeatured = !business.isFeatured;
  business.featurePriority = business.isFeatured ? 10 : 0;

  await business.save();

  res.json({
    success: true,
    data: business,
  });
});

/* ================================
   DASHBOARD STATS
================================ */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const users = await User.countDocuments({
    role: { $in: ["user", "provider"] }
  });

  const admins = await User.countDocuments({
    role: { $in: ["admin", "superadmin"] }
  });

  const cities = await City.countDocuments();
  const categories = await Category.countDocuments();
  const businesses = await Business.countDocuments();

  res.json({
    success: true,
    stats: {
      users,
      admins,
      cities,
      categories,
      businesses
    }
  });
});

/* ================================
   BUSINESS STATS
================================ */
export const getBusinessStats = asyncHandler(async (req, res) => {
  const total = await Business.countDocuments();
  const pending = await Business.countDocuments({ status: "pending" });
  const approved = await Business.countDocuments({ status: "approved" });
  const featured = await Business.countDocuments({ isFeatured: true });

  res.json({
    success: true,
    data: {
      total,
      pending,
      approved,
      featured
    }
  });
});

/* ================================
   CATEGORY
================================ */
export const createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;

  const existing = await Category.findOne({ name });
  if (existing) {
    return res.status(400).json({
      success: false,
      message: "Category already exists"
    });
  }

  const category = await Category.create({
    name
  });

  res.status(201).json({
    success: true,
    data: category
  });
});

// Analytics
export const getAnalytics = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalBusinesses = await Business.countDocuments();
  const totalLeads = await Lead.countDocuments();

  res.json({
    success: true,
    data: {
      totalUsers,
      totalBusinesses,
      totalLeads,
    },
  });
});

// Reports
export const getReports = async (req, res) => {
  try {
    // Example: return all businesses with metrics
    const businesses = await Business.find().populate("categoryId")
.populate("cityId", "name slug");
    res.json({ businesses });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch reports", error: err.message });
  }
};

// System Settings
export const getSystemSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.find();
  res.json({ success: true, data: settings });
});

export const getActivityLogs = asyncHandler(async (req, res) => {
  const logs = await ActivityLogs.find()
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({ success: true, data: logs });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) {
    return res.status(400).json({
      success: false,
      message: "Current password incorrect"
    });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({
    success: true,
    message: "Password updated"
  });
});

export const getAdmins = asyncHandler(async (req, res) => {
  const { role } = req.query;

  const query = {
    role: { $in: ["admin", "superadmin"] }
  };

  // optional filter
  if (role) {
    query.role = role;
  }

  const admins = await User.find(query)
    .select("-password")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    users: admins
  });
});


export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password");

  res.json({
    success: true,
    data: users,
  });
});