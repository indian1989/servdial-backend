import Category from "../models/Category.js";
import slugify from "../utils/slugify.js";

// GET ALL CATEGORIES
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ order: 1 });

    res.json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// TRENDING CATEGORIES
export const getTrendingCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      isTrending: true,
      isActive: true,
    }).limit(8);

    res.json({
      success: true,
      categories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// CATEGORY BY SLUG
export const getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({
      slug: req.params.slug,
      isActive: true,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// CREATE CATEGORY (ADMIN)
export const createCategory = async (req, res) => {
  try {
    const { name, icon, image, description, isTrending } = req.body;

    const slug = slugify(name, { lower: true });

    const category = await Category.create({
      name,
      slug,
      icon,
      image,
      description,
      isTrending,
    });

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create category" });
  }
};

// UPDATE CATEGORY
export const updateCategory = async (req, res) => {
  try {
    const { name } = req.body;

    const slug = slugify(name, { lower: true });

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { ...req.body, slug },
      { new: true }
    );

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
};

// DELETE CATEGORY
export const deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Category deleted",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Delete failed" });
  }
};