import City from "../models/City.js";
import Category from "../models/Category.js";
import Business from "../models/Business.js";
import User from "../models/User.js";


// Create Business

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
      ownerName,
      images
    } = req.body;

    const role = req.user.role;

    // Required for everyone
    if (!name || !category || !city || !district || !state || !phone) {
      return res.status(400).json({
        message: "Required fields missing"
      });
    }

    // Provider-specific validation
    if (role === "provider") {

      if (!ownerName) {
        return res.status(400).json({
          message: "Owner name is required for providers"
        });
      }

      if (!images || images.length === 0) {
        return res.status(400).json({
          message: "At least one image is required"
        });
      }

    }

    const business = await Business.create({
      name,
      category,
      address,
      city,
      district,
      state,
      phone,
      description,
      images: images || [],
      owner: req.user._id
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


/* =========================
   ADMIN DASHBOARD STATS
========================= */

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
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

/* =========================
   BUSINESS STATS
========================= */

export const getBusinessStats = async (req, res) => {
  try {

    const total = await Business.countDocuments();

    const pending = await Business.countDocuments({
      status: "pending"
    });

    const featured = await Business.countDocuments({
      featured: true
    });

    res.json({
      stats: {
        total,
        pending,
        featured
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Featured Business

export const toggleFeatured = async (req, res) => {
  try {

    const { id } = req.params;

    const business = await Business.findById(id);

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    business.featured = !business.featured;

    await business.save();

    res.json({
      message: "Featured status updated",
      featured: business.featured
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error"
    });

  }
};