// Path: backend/controllers/blogCategoryController.js

import asyncHandler from "express-async-handler";
import BlogCategory from "../models/BlogCategory.js";

/*
=================================================
 CREATE BLOG CATEGORY
=================================================
*/
export const createBlogCategory = asyncHandler(async (req, res) => {
  const {
    name,
    slug,
    description,
    image,
    isActive,
    sortOrder,
  } = req.body;

  if (!name || !slug) {
    res.status(400);
    throw new Error("Category name and slug are required");
  }

  const existingCategory = await BlogCategory.findOne({
    $or: [
      { name: name.trim() },
      { slug: slug.trim().toLowerCase() },
    ],
  });

  if (existingCategory) {
    res.status(409);
    throw new Error(
      existingCategory.slug === slug.trim().toLowerCase()
        ? "Blog category slug already exists"
        : "Blog category name already exists"
    );
  }

  const category = await BlogCategory.create({
    name: name.trim(),
    slug: slug.trim().toLowerCase(),
    description: description?.trim() || "",
    image: image?.trim() || "",
    isActive: isActive !== undefined ? isActive : true,
    sortOrder: sortOrder !== undefined ? sortOrder : 0,
  });

  res.status(201).json({
    success: true,
    message: "Blog category created successfully",
    category,
  });
});


/*
=================================================
 GET ALL BLOG CATEGORIES
=================================================
*/
export const getAllBlogCategories = asyncHandler(async (req, res) => {
  const {
    search = "",
    isActive,
  } = req.query;

  const filter = {};

  if (search.trim()) {
    filter.$or = [
      {
        name: {
          $regex: search.trim(),
          $options: "i",
        },
      },
      {
        slug: {
          $regex: search.trim(),
          $options: "i",
        },
      },
    ];
  }

  if (isActive !== undefined) {
    filter.isActive = isActive === "true";
  }

  const categories = await BlogCategory.find(filter)
    .sort({
      sortOrder: 1,
      name: 1,
    });

  res.status(200).json({
    success: true,
    count: categories.length,
    categories,
  });
});


/*
=================================================
 GET ACTIVE BLOG CATEGORIES
=================================================
*/
export const getActiveBlogCategories = asyncHandler(
  async (req, res) => {
    const categories = await BlogCategory.find({
      isActive: true,
    }).sort({
      sortOrder: 1,
      name: 1,
    });

    res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  }
);


/*
=================================================
 GET BLOG CATEGORY BY ID
=================================================
*/
export const getBlogCategoryById = asyncHandler(
  async (req, res) => {
    const category = await BlogCategory.findById(req.params.id);

    if (!category) {
      res.status(404);
      throw new Error("Blog category not found");
    }

    res.status(200).json({
      success: true,
      category,
    });
  }
);


/*
=================================================
 UPDATE BLOG CATEGORY
=================================================
*/
export const updateBlogCategory = asyncHandler(
  async (req, res) => {
    const category = await BlogCategory.findById(req.params.id);

    if (!category) {
      res.status(404);
      throw new Error("Blog category not found");
    }

    const {
      name,
      slug,
      description,
      image,
      isActive,
      sortOrder,
    } = req.body;

    if (name !== undefined) {
      category.name = name.trim();
    }

    if (slug !== undefined) {
      category.slug = slug.trim().toLowerCase();
    }

    if (description !== undefined) {
      category.description = description.trim();
    }

    if (image !== undefined) {
      category.image = image.trim();
    }

    if (isActive !== undefined) {
      category.isActive = isActive;
    }

    if (sortOrder !== undefined) {
      category.sortOrder = sortOrder;
    }

    const duplicateCategory = await BlogCategory.findOne({
      _id: { $ne: category._id },
      $or: [
        { name: category.name },
        { slug: category.slug },
      ],
    });

    if (duplicateCategory) {
      res.status(409);
      throw new Error(
        duplicateCategory.slug === category.slug
          ? "Blog category slug already exists"
          : "Blog category name already exists"
      );
    }

    await category.save();

    res.status(200).json({
      success: true,
      message: "Blog category updated successfully",
      category,
    });
  }
);


/*
=================================================
 DELETE BLOG CATEGORY
=================================================
*/
export const deleteBlogCategory = asyncHandler(
  async (req, res) => {
    const category = await BlogCategory.findById(req.params.id);

    if (!category) {
      res.status(404);
      throw new Error("Blog category not found");
    }

    await category.deleteOne();

    res.status(200).json({
      success: true,
      message: "Blog category deleted successfully",
    });
  }
);