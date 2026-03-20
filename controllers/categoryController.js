import Category from "../models/Category.js";
import slugify from "../utils/slugify.js";

// ==============================
// GET ALL CATEGORIES
// ==============================
export const getCategories = async (req, res) => {
  try {
    const categories = await Category
      .find({ status: "active" }) // ✅ FIXED
      .sort({ createdAt: -1 });   // ✅ FIXED (no 'order' field)

    res.json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("GET CATEGORIES ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==============================
// TRENDING CATEGORIES
// ==============================
export const getTrendingCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      isTrending: true,
      status: "active", // ✅ FIXED
    }).limit(8);

    res.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("TRENDING CATEGORY ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==============================
// CATEGORY BY SLUG
// ==============================
export const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({
      slug,
      status: "active", // ✅ FIXED
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
    console.error("GET CATEGORY BY SLUG ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==============================
// CREATE CATEGORY
// ==============================
export const createCategory = async (req, res) => {
  try {
    const { name, icon, image, description, isTrending } = req.body;

    const slug = slugify(name);

    const category = await Category.create({
      name,
      slug,
      icon,
      image,
      description,
      isTrending,
      status: "active", // ✅ ensure active
    });

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("CREATE CATEGORY ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

// ==============================
// UPDATE CATEGORY
// ==============================
export const updateCategory = async (req, res) => {
  try {
    const { name } = req.body;

    const slug = name
      ? slugify(name, { lower: true })
      : undefined;

    const updateData = {
      ...req.body,
      ...(slug && { slug }),
    };

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("UPDATE CATEGORY ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Update failed",
    });
  }
};

// ==============================
// DELETE CATEGORY
// ==============================
export const deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Category deleted",
    });
  } catch (error) {
    console.error("DELETE CATEGORY ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
};