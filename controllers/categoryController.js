import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Category from "../models/Category.js";
import slugify from "../utils/slugify.js";
import { getCache, setCache, deleteCache } from "../utils/memoryCache.js";

/* ================= HELPERS ================= */

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/* =========================================================
   🔥 RESOLVE CATEGORY BY SLUG (CORE SEO ENGINE)
   ========================================================= */
export const resolveCategoryBySlug = async (slug) => {
  if (!slug) return null;

  const cacheKey = `category:slug:${slug}`;

  const cached = getCache(cacheKey);
  if (cached) return cached;

  const category = await Category.findOne({
    $or: [
      { slug },
      { "slugHistory.slug": slug }
    ],
    status: "active"
  }).lean();

  if (category) {
    setCache(cacheKey, category, 60 * 60 * 6);
  }

  return category;
};

/* =========================================================
   🔥 GET FULL CATEGORY TREE (NO PAGINATION)
   ========================================================= */
export const getCategoryTree = asyncHandler(async (req, res) => {
  const categories = await Category.find({ status: "active" })
    .select("name slug parentCategory icon order")
    .sort({ order: 1 })
    .lean();

  // build tree
  const map = {};
  const roots = [];

  categories.forEach(cat => {
    map[cat._id] = { ...cat, children: [] };
  });

  categories.forEach(cat => {
    if (cat.parentCategory) {
      map[cat.parentCategory]?.children.push(map[cat._id]);
    } else {
      roots.push(map[cat._id]);
    }
  });

  res.json({
    success: true,
    data: roots,
    meta: {
      total: categories.length,
      type: "tree",
      timestamp: new Date().toISOString()
    }
  });
});

/* =========================================================
   🔥 GET LEAF CATEGORY IDS (CRITICAL FOR SEARCH)
   ========================================================= */
export const getLeafCategoryIds = async (categoryId) => {
  if (!categoryId) return [];

  const cacheKey = `category:leaf:${categoryId}`;

  // 🔥 CACHE HIT
  const cached = getCache(cacheKey);
  if (cached) return cached;

  // 🔥 FETCH CHILDREN
  const children = await Category.find({
    parentCategory: categoryId,
    status: "active"
  }).select("_id").lean();

  let result;

if (!children.length) {
  result = [categoryId];
} else {
  result = children.map(c => c._id);
}

// 🔒 SAFETY: always include self (future-proof)
if (!result.includes(categoryId)) {
  result.push(categoryId);
}

  // 🔥 STORE CACHE (6 HOURS)
  setCache(cacheKey, result, 60 * 60 * 6);

  return result;
};

/* =========================================================
   🔥 GET CATEGORY WITH CHILDREN
   ========================================================= */
export const getCategoryWithChildren = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const category = await resolveCategoryBySlug(slug);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found"
    });
  }

  const children = await Category.find({
    parentCategory: category._id,
    status: "active"
  })
    .select("name slug icon")
    .sort({ order: 1 })
    .lean();

  res.json({
  success: true,
  data: {
  category: {
    _id: category._id,
    name: category.name,
    slug: category.slug,
    icon: category.icon || null
  },
  children
},
  meta: {
    total: children.length,
    category: {
      name: category.name,
      slug: category.slug
    },
    timestamp: new Date().toISOString()
  }
});
});
/* =========================================================
   ================= ADMIN SECTION =================
   ========================================================= */

/* ================= CREATE ================= */
export const createCategory = asyncHandler(async (req, res) => {
  const { name, parentCategory, order } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({
      success: false,
      message: "Name is required"
    });
  }

  let parent = null;

  if (parentCategory) {
    if (!isValidId(parentCategory)) {
      return res.status(400).json({
        success: false,
        message: "Invalid parent ID"
      });
    }

    parent = await Category.findById(parentCategory);

    if (!parent) {
      return res.status(400).json({
        success: false,
        message: "Parent not found"
      });
    }
  }

  const slug = slugify(name);

// 🔒 prevent duplicate slug
const existingSlug = await Category.findOne({ slug });

if (existingSlug) {
  return res.status(400).json({
    success: false,
    message: "Slug already exists"
  });
}

const category = await Category.create({
  name: name.trim(),
  slug,
  parentCategory: parent?._id || null,
  order: Number(order) || 0,
  status: "active"
});

  res.status(201).json({
    success: true,
    data: category,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
});

/* ================= UPDATE ================= */
export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid ID"
    });
  }

  const existing = await Category.findById(id);

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Category not found"
    });
  }

  if (req.body.slug) {
    return res.status(400).json({
      success: false,
      message: "Slug cannot be updated directly"
    });
  }

  const updated = await Category.findByIdAndUpdate(
    id,
    req.body,
    { new: true, runValidators: true }
  ).lean();

// invalidate slug cache
// current slug
deleteCache(`category:slug:${existing.slug}`);

// old slugs
(existing.slugHistory || []).forEach(s => {
  deleteCache(`category:slug:${s.slug || s}`);
});

// leaf cache
deleteCache(`category:leaf:${existing._id}`);

// 🔥 parent cache also affected
if (existing.parentCategory) {
  deleteCache(`category:leaf:${existing.parentCategory}`);
}

  res.json({
    success: true,
    data: updated,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
});

/* ================= DELETE ================= */
export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid ID"
    });
  }

  const existing = await Category.findById(id);

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Category not found"
    });
  }

  // move children to root
  await Category.updateMany(
    { parentCategory: id },
    { parentCategory: null }
  );

  // preserve slug for SEO
  existing.slugHistory = [
    ...(existing.slugHistory || []),
    existing.slug
  ];

  existing.status = "inactive";
  await existing.save();

  // invalidate slug cache
// current slug
deleteCache(`category:slug:${existing.slug}`);

// old slugs
(existing.slugHistory || []).forEach(s => {
  deleteCache(`category:slug:${s.slug || s}`);
});

// leaf cache
deleteCache(`category:leaf:${existing._id}`);

// 🔥 parent cache also affected
if (existing.parentCategory) {
  deleteCache(`category:leaf:${existing.parentCategory}`);
}

  res.json({
    success: true,
    data: null,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
});


// to be remove according phase 1
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