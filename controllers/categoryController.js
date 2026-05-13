import Category from "../models/Category.js";
import slugify from "../utils/slugify.js";
import memoryCache from "../utils/memoryCache.js";
import { pingSearchEngines } from "../services/seo/pingSearchEngines.js";

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
export const getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({
      slug: req.params.slug,
    }).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (err) {
    console.error("getCategoryBySlug:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch category",
    });
  }
};

/* ================= GET CHILDREN ================= */
export const getCategoryWithChildren = async (req, res) => {
  try {
    const parent = await Category.findOne({
      slug: req.params.slug,
    }).lean();

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const children = await Category.find({
      parentCategory: parent._id,
    }).lean();

    res.json({
      success: true,
      data: {
        parent,
        children,
      },
    });
  } catch (err) {
    console.error("getCategoryWithChildren:", err);

    res.status(500).json({
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
    } = req.body;

    const slug = slugify(name);

    const exists = await Category.findOne({ slug });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    const category = await Category.create({
      name,
      slug,
      parentCategory,
      order,
      description,
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
    } = req.body;

    if (name && name !== category.name) {
      const newSlug = slugify(name);

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

      category.name = name;
      category.slug = newSlug;
    }

    if (order !== undefined) category.order = order;
    if (status !== undefined) category.status = status;
    if (description !== undefined)
      category.description = description;
    if (parentCategory !== undefined)
      category.parentCategory = parentCategory || null;
    if (isTrending !== undefined)
      category.isTrending = isTrending;

    await category.save();

    resetCategoryCache();
    await pingSearchEngines();

    res.json({
      success: true,
      data: category,
    });
  } catch (err) {
    console.error("updateCategory:", err);

    res.status(500).json({
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