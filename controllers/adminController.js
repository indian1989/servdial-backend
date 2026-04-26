// backend/controllers/adminController.js
import Business from "../models/Business.js";
import Category from "../models/Category.js";
import City from "../models/City.js";
import User from "../models/User.js";

/* ================================
   GET ADMIN BUSINESSES
================================ */
export const getAdminBusinesses = async (req, res) => {
  try {
    const { status, city, category, search, page = 1, limit = 20 } = req.query;

    const query = {};

    // filters
    if (status) query.status = status;
    if (city) query.city = city;
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
      businesses,
      total,
      page: Number(page),
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================================
   APPROVE BUSINESS
================================ */
export const approveBusiness = async (req, res) => {
  try {
    const business = await Business.findByIdAndUpdate(req.params.id, { status: "approved" }, { new: true });
    if (!business) return res.status(404).json({ success: false, message: "Business not found" });
    res.json({ success: true, message: "Business approved", business });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   REJECT BUSINESS
================================ */
export const rejectBusiness = async (req, res) => {
  try {
    const business = await Business.findByIdAndUpdate(req.params.id, { status: "rejected" }, { new: true });
    if (!business) return res.status(404).json({ success: false, message: "Business not found" });
    res.json({ success: true, message: "Business rejected", business });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   DELETE BUSINESS
================================ */
export const deleteBusiness = async (req, res) => {
  try {
    const business = await Business.findByIdAndDelete(req.params.id);
    if (!business) return res.status(404).json({ success: false, message: "Business not found" });
    res.json({ success: true, message: "Business deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   TOGGLE FEATURED
================================ */
export const toggleFeatured = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    // ✅ FIXED FIELD NAME
    business.isFeatured = !business.isFeatured;

    // optional ranking boost
    business.featurePriority = business.isFeatured ? 10 : 0;

    await business.save();

    res.json({
      success: true,
      message: "Featured status updated",
      business
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================================
   DASHBOARD STATS
================================ */
export const getDashboardStats = async (req, res) => {
  try {
    // 🔥 FIXED ROLE LOGIC
const users = await User.countDocuments({
  role: { $in: ["user", "provider"] } // include providers
});

const admins = await User.countDocuments({
  role: { $in: ["admin", "superadmin"] }
});
    const cities = await City.countDocuments();
    const categories = await Category.countDocuments();

    res.json({ success: true, stats: { users, admins, cities, categories } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   BUSINESS STATS
================================ */
export const getBusinessStats = async (req, res) => {
  try {
    const total = await Business.countDocuments();
    const pending = await Business.countDocuments({ status: "pending" });
    const featured = await Business.countDocuments({ isFeatured: true });
const expiredFeatured = await Business.countDocuments({
  isFeatured: true,
  featuredUntil: { $lt: new Date() }
});

    res.json({ success: true, stats: { total, pending, featured } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   CATEGORY
================================ */
export const createCategory = async (req, res) => {
  try {
    const { category } = req.body;
    const existing = await Category.findOne({ category });
    if (existing) return res.status(400).json({ success: false, message: "Category already exists" });

    const newCategory = await Category.create({ category });
    res.status(201).json({ success: true, message: "Category created successfully", category: newCategory });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Analytics
export const getAnalytics = async (req, res) => {
  try {
    // Example: aggregate data for dashboard
    const totalUsers = await User.countDocuments();
    const totalBusinesses = await Business.countDocuments();
    const totalOrders = await Order.countDocuments(); // if you track orders
    res.json({ totalUsers, totalBusinesses, totalOrders });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch analytics", error: err.message });
  }
};

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
export const getSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.find();
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch system settings", error: err.message });
  }
};

// Activity Logs
export const getActivityLogs = async (req, res) => {
  try {
    const logs = await ActivityLogs.find().sort({ createdAt: -1 }).limit(100);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch activity logs", error: err.message });
  }
};