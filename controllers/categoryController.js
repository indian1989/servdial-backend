// backend/controllers/categoryController.js

import asyncHandler from "express-async-handler";
import Category from "../models/Category.js";

/* ================= BUILD TREE (helper) ================= */
const buildTree = (categories, parentId = null) => {
  return categories
    .filter((cat) =>
      parentId === null
        ? !cat.parentCategory
        : String(cat.parentCategory) === String(parentId)
    )
    .map((cat) => ({
      ...cat,
      children: buildTree(categories, cat._id),
    }));
};

/* ================= GET ALL ================= */
export const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ status: "active" })
    .sort({ order: 1, createdAt: -1 })
    .lean();

  return res.json({
    success: true,
    categories,
    tree: buildTree(categories),
  });
});

/* ================= GET BY SLUG ================= */
export const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    slug: req.params.slug,
    status: "active",
  }).lean();

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found",
    });
  }

  return res.json({
    success: true,
    category,
  });
});

/* ================= TRENDING ================= */
export const getTrendingCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({
    isTrending: true,
    status: "active",
  })
    .sort({ order: 1 })
    .limit(8)
    .lean();

  return res.json({
    success: true,
    categories,
  });
});

/* ================= CREATE ================= */
export const createCategory = asyncHandler(async (req, res) => {
  const { name, order, description, keywords, parentCategory } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({
      success: false,
      message: "Name is required",
    });
  }

  // ================= LEVEL LOGIC =================
  let level = 0;

  if (parentCategory) {
    const parent = await Category.findById(parentCategory);

    if (!parent) {
      return res.status(400).json({
        success: false,
        message: "Invalid parent category",
      });
    }

    level = 1;
  }

  const category = await Category.create({
    name: name.trim(),
    order: Number(order) || 0,
    description: description || "",
    keywords: keywords || [],
    parentCategory: parentCategory || null,
    level,
    status: "active",
  });

  return res.json({
    success: true,
    category,
  });
});

/* ================= UPDATE ================= */
export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "ID missing",
    });
  }

  const existing = await Category.findById(id);

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Category not found",
    });
  }

  let { parentCategory } = req.body;

  let level = existing.level;

  if (parentCategory !== undefined) {
    if (parentCategory) {
      const parent = await Category.findById(parentCategory);

      if (!parent) {
        return res.status(400).json({
          success: false,
          message: "Invalid parent category",
        });
      }

      if (String(parent._id) === String(id)) {
        return res.status(400).json({
          success: false,
          message: "Category cannot be its own parent",
        });
      }

      level = 1;
    } else {
      level = 0;
    }
  }

  const updateData = {
    ...req.body,
    parentCategory:
      parentCategory !== undefined
        ? parentCategory
        : existing.parentCategory,
    level,
    ...(req.body.order !== undefined && {
      order: Number(req.body.order),
    }),
  };

  const category = await Category.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  return res.json({
    success: true,
    category,
  });
});

/* ================= DELETE ================= */
export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "ID missing",
    });
  }

  // prevent orphan children
  await Category.updateMany(
    { parentCategory: id },
    { parentCategory: null, level: 0 }
  );

  const deleted = await Category.findByIdAndDelete(id);

  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: "Category not found",
    });
  }

  return res.json({
    success: true,
  });
});