import mongoose from "mongoose";

import Category from "../models/Category.js";
import slugify from "../utils/slugify.js";
import memoryCache from "../utils/memoryCache.js";
import { pingSearchEngines } from "../services/seo/pingSearchEngines.js";
import { generateCategoryKeywords } from "../utils/categoryKeywords.js";

/* ================= CACHE RESET ================= */
const resetCategoryCache = () => {
  memoryCache.del("categories:tree");
};

/* ================= BUILD TREE ================= */
const buildCategoryTree = (categories) => {
  const map = {};
  const roots = [];

  categories.forEach((cat) => {
    map[cat._id] = {
      ...cat,
      children: [],
    };
  });

  categories.forEach((cat) => {
    if (cat.parentCategory) {
      map[cat.parentCategory]?.children.push(map[cat._id]);
    } else {
      roots.push(map[cat._id]);
    }
  });

  return roots;
};

/* ================= GET ALL ================= */
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      status: "active",
    }).lean();

    res.json({
      success: true,
      data: categories,
    });
  } catch (err) {
    console.error("getAllCategories:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

/* ================= GET TREE ================= */
export const getCategoryTree = async (req, res) => {
  try {
    const cacheKey = "categories:tree";

    const cached = memoryCache.get(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        data: cached,
      });
    }

    const categories = await Category.find({
      status: "active",
    }).lean();

    const tree = buildCategoryTree(categories);

    memoryCache.set(cacheKey, tree, 60 * 60 * 6);

    res.json({
      success: true,
      data: tree,
    });
  } catch (err) {
    console.error("getCategoryTree:", err);

    res.status(500).json({
      success: false,
      message: "Failed to build category tree",
    });
  }
};

/* ================= GET BY SLUG ================= */

/* ================= GET BY SLUG ================= */

export const getCategoryBySlug = async (req, res) => {
  try {
    const value = req.params.slug?.toLowerCase().trim();

    if (!value) {
      return res.status(400).json({
        success: false,
        message: "Category slug is required",
      });
    }

    let category = null;
    let isOldSlug = false;

    /* =====================================================
       1. CURRENT SLUG
    ===================================================== */

    category = await Category.findOne({
      slug: value,
      status: "active",
    });

    /* =====================================================
       2. OLD SLUG FROM SLUG HISTORY
    ===================================================== */

    if (!category) {
      category = await Category.findOne({
        "slugHistory.slug": value,
        status: "active",
      });

      if (category) {
        isOldSlug = true;
      }
    }

    /* =====================================================
       3. NOT FOUND
    ===================================================== */

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    /* =====================================================
       4. OLD → CURRENT SLUG
    ===================================================== */

    return res.json({
      success: true,

      data: category,

      redirect: isOldSlug,

      canonicalSlug: category.slug,
    });

  } catch (err) {
    console.error(
      "getCategoryBySlug error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ================= GET CHILDREN ================= */
export const getCategoryWithChildren = async (req, res) => {
  try {
    const value = req.params.slug?.toLowerCase().trim();

    if (!value) {
      return res.status(400).json({
        success: false,
        message: "Category slug is required",
      });
    }

    let parent = null;
    let isOldSlug = false;

    /* =====================================================
       1. CURRENT SLUG
    ===================================================== */

    parent = await Category.findOne({
      slug: value,
      status: "active",
    }).lean();

    /* =====================================================
       2. OLD SLUG FROM SLUG HISTORY
    ===================================================== */

    if (!parent) {
      parent = await Category.findOne({
        "slugHistory.slug": value,
        status: "active",
      }).lean();

      if (parent) {
        isOldSlug = true;
      }
    }

    /* =====================================================
       3. NOT FOUND
    ===================================================== */

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    /* =====================================================
       4. CHILDREN
    ===================================================== */

    const children = await Category.find({
      parentCategory: parent._id,
      status: "active",
    })
      .sort({ order: 1, name: 1 })
      .lean();

    /* =====================================================
       5. RESPONSE
    ===================================================== */

    return res.json({
      success: true,

      data: {
        parent,
        children,
      },

      redirect: isOldSlug,
      canonicalSlug: parent.slug,
    });

  } catch (err) {
    console.error(
      "getCategoryWithChildren:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch children",
    });
  }
};

/* ================= TRENDING ================= */
export const getTrendingCategories = async (req, res) => {
  try {
    const trending = await Category.find({
      status: "active",
      isTrending: true,
    })
      .limit(20)
      .lean();

    res.json({
      success: true,
      data: trending,
    });
  } catch (err) {
    console.error("getTrendingCategories:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch trending categories",
    });
  }
};

/* ================= CREATE ================= */
export const createCategory = async (req, res) => {
  try {
    const {
  name,
  parentCategory = null,
  order = 0,
  description = "",
  uiType = "service",
  features = [],
} = req.body;

    const slug = slugify(name);

    const exists = await Category.findOne({ slug });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    const level = parentCategory ? 1 : 0;

    const finalFeatures = [...new Set([...(features || []), "offers"])];

const keywords = generateCategoryKeywords({
  name,
  slug,
});

const category = await Category.create({
  name,
  slug,
  parentCategory,
  level,
  order,
  description,
  uiType,
  features: finalFeatures,
  keywords,
});

    resetCategoryCache();
    await pingSearchEngines();

    res.json({
      success: true,
      data: category,
    });
  } catch (err) {
    console.error("createCategory:", err);

    res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

/* ================= UPDATE ================= */
export const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const {
      name,
      order,
      status,
      description,
      parentCategory,
      isTrending,
      uiType,
      features,
    } = req.body;

    /* =====================================================
       CATEGORY NAME + SLUG
    ===================================================== */

    if (name !== undefined && name.trim() !== category.name) {
      const cleanName = name
        .trim()
        .replace(/\s+/g, " ");

      const newSlug = slugify(cleanName);

      const slugExists = await Category.findOne({
        slug: newSlug,
        _id: { $ne: category._id },
      });

      if (slugExists) {
        return res.status(400).json({
          success: false,
          message: "Slug already exists",
        });
      }

      /* ===============================================
         IMPORTANT

         Save old slug BEFORE changing category.slug.
         Category.js pre-save middleware will also
         detect the slug modification and store the
         previous slug in slugHistory.
      =============================================== */

      category.name = cleanName;
      category.slug = newSlug;
    }

    /* =====================================================
       BASIC FIELDS
    ===================================================== */

    if (order !== undefined) {
      category.order = order;
    }

    if (status !== undefined) {
      category.status = status;
    }

    if (description !== undefined) {
      category.description = description;
    }

    /* =====================================================
       PARENT CATEGORY + LEVEL
    ===================================================== */

    if (parentCategory !== undefined) {
      category.parentCategory =
        parentCategory || null;

      category.level =
        parentCategory ? 1 : 0;
    }

    /* =====================================================
       UI TYPE
    ===================================================== */

    if (uiType !== undefined) {
      category.uiType = uiType;
    }

    /* =====================================================
       FEATURES
       Always preserve existing features.
       "offers" remains mandatory.
    ===================================================== */

    category.features = [
      ...new Set([
        ...(features ?? category.features ?? []),
        "offers",
      ]),
    ];

    /* =====================================================
       TRENDING
    ===================================================== */

    if (isTrending !== undefined) {
      category.isTrending = isTrending;
    }

    /* =====================================================
       SAVE

       IMPORTANT:
       category.save() triggers Category.js
       pre-save middleware.

       If slug changed:
       old slug → slugHistory[]
    ===================================================== */

    /* =====================================================
   AUTO GENERATE KEYWORDS
===================================================== */

category.keywords = generateCategoryKeywords({
  name: category.name,
  slug: category.slug,
});

    await category.save();

    /* =====================================================
       CACHE RESET
    ===================================================== */

    resetCategoryCache();

    /* =====================================================
       SEARCH ENGINE PING
    ===================================================== */

    await pingSearchEngines();

    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.json({
      success: true,
      data: category,
      canonicalSlug: category.slug,
      slugHistory: category.slugHistory || [],
    });

  } catch (err) {
    console.error(
      "updateCategory:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update category",
    });
  }
};


/* ================= DELETE ================= */
export const deleteCategory = async (req, res) => {
  try {
    const hasChildren = await Category.exists({
      parentCategory: req.params.id,
    });

    if (hasChildren) {
      return res.status(400).json({
        success: false,
        message: "Has children categories",
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    resetCategoryCache();
    await pingSearchEngines();

    res.json({
      success: true,
    });
  } catch (err) {
    console.error("deleteCategory:", err);

    res.status(500).json({
      success: false,
      message: "Failed to delete category",
    });
  }
};