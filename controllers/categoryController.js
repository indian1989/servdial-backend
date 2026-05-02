import Category from "../models/Category.js";
import slugify from "../utils/slugify.js";
import memoryCache from "../utils/memoryCache.js";

/* ================= BUILD TREE ================= */
const buildCategoryTree = (categories) => {
  const map = {};
  const roots = [];

  categories.forEach((cat) => {
    map[cat._id] = { ...cat.toObject(), children: [] };
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

/* ================= GET ALL (FLAT) ================= */
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ status: "active" }).lean();

    res.json({
      success: true,
      data: categories,
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

/* ================= GET TREE ================= */
export const getCategoryTree = async (req, res) => {
  try {
    const cacheKey = "categories:tree";

    const cached = memoryCache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const categories = await Category.find({ status: "active" }).lean();

    const tree = buildCategoryTree(categories);

    memoryCache.set(cacheKey, tree, 60 * 60 * 6);

    res.json({
      success: true,
      data: tree,
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

/* ================= GET BY SLUG ================= */
export const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({ slug }).lean();

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
    res.status(500).json({ success: false });
  }
};

/* ================= GET CHILDREN ================= */
export const getCategoryWithChildren = async (req, res) => {
  try {
    const { slug } = req.params;

    const parent = await Category.findOne({ slug }).lean();

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
    res.status(500).json({ success: false });
  }
};

/* ================= TRENDING ================= */
export const getTrendingCategories = async (req, res) => {
  try {
    const trending = await Category.find({
      status: "active",
      isTrending: true,
    }).limit(20);

    res.json({
      success: true,
      data: trending,
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

/* ================= CREATE ================= */
export const createCategory = async (req, res) => {
  try {
    const { name, parentCategory = null, order = 0 } = req.body;

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
    });

    memoryCache.del("categories:tree");

    res.json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

/* ================= UPDATE ================= */
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
      });
    }

    const { name, order, status } = req.body;

    if (name && name !== category.name) {
      category.slug = slugify(name);
      category.name = name;
    }

    if (order !== undefined) category.order = order;
    if (status) category.status = status;

    await category.save();

    memoryCache.del("categories:tree");

    res.json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

/* ================= DELETE ================= */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const hasChildren = await Category.exists({
      parentCategory: id,
    });

    if (hasChildren) {
      return res.status(400).json({
        success: false,
        message: "Has children categories",
      });
    }

    await Category.findByIdAndDelete(id);

    memoryCache.del("categories:tree");

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};