import City from "../models/City.js";
import Category from "../models/Category.js";
import Business from "../models/Business.js";
import User from "../models/User.js";


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

//Create Business

export const createBusiness = async (req, res) => {
  try {

    const business = await Business.create(req.body);

    res.status(201).json({
      message: "Business created successfully",
      business
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server Error"
    });
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