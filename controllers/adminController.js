import Business from "../models/Business.js";
import Category from "../models/Category.js";
import City from "../models/City.js";
import User from "../models/User.js";

/* ================================
   CREATE BUSINESS
================================ */

export const createBusiness = async (req, res) => {
  try {

    const {
      name,
      category,
      address,
      city,
      district,
      state,
      phone,
      description,
      images,
      ownerName
    } = req.body;

    const role = req.user.role;

    if (!name || !category || !city || !district || !state || !phone) {
      return res.status(400).json({
        message: "Required fields missing"
      });
    }

    /* ================= CATEGORY FIX ================= */

    let categoryName = category;

    const categoryDoc = await Category.findById(category);

    if (categoryDoc) {
      categoryName = categoryDoc.name;
    }

    /* ================= PROVIDER VALIDATION ================= */

    if (role === "provider") {

      if (!ownerName) {
        return res.status(400).json({
          message: "Owner name required for provider"
        });
      }

      if (!images || images.length === 0) {
        return res.status(400).json({
          message: "At least one image required"
        });
      }

    }

    /* ================= BUSINESS CREATE ================= */

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

      // Admin auto approval
      status: role === "provider" ? "pending" : "approved"

    });

    res.status(201).json({
      success: true,
      message: "Business created successfully",
      business
    });

  } catch (error) {

    console.error("Create business error:", error);

    res.status(500).json({
      message: error.message
    });

  }
};


/* ================================
   GET ALL BUSINESSES
================================ */

export const getAllBusinesses = async (req, res) => {
  try {

    const businesses = await Business.find()
      .populate("owner", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      businesses
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};


/* ================================
   APPROVE BUSINESS
================================ */

export const approveBusiness = async (req, res) => {
  try {

    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );

    res.json({
      success: true,
      business
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};


/* ================================
   REJECT BUSINESS
================================ */

export const rejectBusiness = async (req, res) => {
  try {

    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );

    res.json({
      success: true,
      business
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};


/* ================================
   DELETE BUSINESS
================================ */

export const deleteBusiness = async (req, res) => {
  try {

    await Business.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Business deleted successfully"
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};


/* ================================
   FEATURE BUSINESS
================================ */

export const toggleFeatured = async (req, res) => {
  try {

    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({
        message: "Business not found"
      });
    }

    business.isFeatured = !business.isFeatured;

    await business.save();

    res.json({
      success: true,
      featured: business.isFeatured
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

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

    res.json({
      stats: {
        users,
        admins,
        cities,
        categories
      }
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};


/* ================================
   BUSINESS STATS
================================ */

export const getBusinessStats = async (req, res) => {
  try {

    const total = await Business.countDocuments();

    const pending = await Business.countDocuments({
      status: "pending"
    });

    const featured = await Business.countDocuments({
      isFeatured: true
    });

    res.json({
      stats: {
        total,
        pending,
        featured
      }
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};

/* =========================
   CITY
========================= */

export const createCity = async (req, res) => {
  try {
    const { city, state } = req.body;

    const existing = await City.findOne({ city, state });
    if (existing) {
      return res.status(400).json({ message: "City already exists" });
    }

    const newCity = await City.create({ city, state });

    res.status(201).json({
      city: newCity.city,
      state: newCity.state
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};


/* =========================
   CATEGORY
========================= */

export const createCategory = async (req, res) => {
  try {

    const { category } = req.body;

    const existing = await Category.findOne({ category });
    if (existing) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const newCategory = await Category.create({ category });

    res.status(201).json({
      category: newCategory.category
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};


