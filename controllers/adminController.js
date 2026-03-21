import Business from "../models/Business.js";
import Category from "../models/Category.js";
import City from "../models/City.js";
import User from "../models/User.js";

/* ================================
   CREATE BUSINESS
================================ */
export const createBusiness = async (req, res) => {
  try {
    const { name, category, address, city, district, state, phone, description, images, ownerName } = req.body;
    const role = req.user.role;

    if (!name || !category || !city || !district || !state || !phone) {
      return res.status(400).json({ success: false, message: "Required fields missing" });
    }

    // CATEGORY FIX
    let categoryName = category;
    const categoryDoc = await Category.findById(category);
    if (categoryDoc) categoryName = categoryDoc.name;

    // PROVIDER VALIDATION
    if (role === "provider") {
      if (!ownerName) return res.status(400).json({ success: false, message: "Owner name required for provider" });
      if (!images || images.length === 0) return res.status(400).json({ success: false, message: "At least one image required" });
    }

    const business = await Business.create({
      name,
      category: categoryName,
      address,
      city,
      district,
      state,
      phone,
      description,
      images: images || [],
      owner: req.user._id,
      status: role === "provider" ? "pending" : "approved",
    });

    res.status(201).json({ success: true, message: "Business created successfully", business });

  } catch (error) {
    console.error("Create business error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   GET ALL BUSINESSES
================================ */
export const getAllBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find().populate("owner", "name email").sort({ createdAt: -1 });
    res.json({ success: true, message: "Businesses fetched successfully", businesses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    if (!business) return res.status(404).json({ success: false, message: "Business not found" });

    business.featured = !business.featured;
    await business.save();

    res.json({ success: true, message: "Featured status updated", featured: business.featured });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   DASHBOARD STATS
================================ */
export const getDashboardStats = async (req, res) => {
  try {
    const users = await User.countDocuments({ role: "user" });
    const admins = await User.countDocuments({ role: "admin" });
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
    const featured = await Business.countDocuments({ featured: true });

    res.json({ success: true, stats: { total, pending, featured } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   CITY
================================ */
export const createCity = async (req, res) => {
  try {
    const { city, state } = req.body;
    const existing = await City.findOne({ city, state });
    if (existing) return res.status(400).json({ success: false, message: "City already exists" });

    const newCity = await City.create({ city, state });
    res.status(201).json({ success: true, message: "City created successfully", city: newCity });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
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
    const businesses = await Business.find().populate("category city");
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