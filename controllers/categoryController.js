import Category from "../models/Category.js";

/* ================= GET ALL ================= */
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .populate("parentCategory", "_id name")
      .sort({ order: 1, name: 1 })
      .lean();

    const map = new Map();
    const roots = [];

    // build map
    for (const cat of categories) {
      map.set(cat._id.toString(), { ...cat, subcategories: [] });
    }

    // build tree
    for (const cat of categories) {
      const node = map.get(cat._id.toString());

      const parentId =
        cat.parentCategory?._id?.toString?.() ||
        cat.parentCategory?.toString?.();

      if (parentId && map.has(parentId)) {
        map.get(parentId).subcategories.push(node);
      } else {
        roots.push(node);
      }
    }

    // sort tree recursively
    const sortTree = (nodes) => {
      nodes.sort((a, b) =>
        Number(a.order || 0) - Number(b.order || 0) ||
        a.name.localeCompare(b.name)
      );

      for (const n of nodes) {
        if (n.subcategories?.length) {
          sortTree(n.subcategories);
        }
      }
    };

    sortTree(roots);

    return res.json({
      success: true,
      categories: roots,
      flatCategories: categories,
      total: categories.length,
    });

  } catch (error) {
    console.error("GET ALL CATEGORIES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      categories: [],
      flatCategories: [],
    });
  }
};


/* ================= GET BY SLUG ================= */
export const getCategoryBySlug = async (req, res) => {
  try {
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

  } catch (error) {
    console.error("GET CATEGORY BY SLUG ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


/* ================= TRENDING ================= */
export const getTrendingCategories = async (req, res) => {
  try {
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

  } catch (error) {
    console.error("TRENDING CATEGORY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


/* ================= CREATE ================= */
export const createCategory = async (req, res) => {
  try {
    const { name, parentCategory, order, description } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const category = await Category.create({
      name: name.trim(),
      parentCategory: parentCategory || null,
      order: Number(order) || 0,
      description: description || "",
      status: "active",
    });

    return res.json({
      success: true,
      category,
    });

  } catch (error) {
    console.error("CREATE CATEGORY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* ================= UPDATE ================= */
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID missing",
      });
    }

    const updateData = {
      ...req.body,
      ...(req.body.order !== undefined && {
        order: Number(req.body.order),
      }),
    };

    const category = await Category.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.json({ success: true, category });

  } catch (error) {
    console.error("UPDATE CATEGORY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* ================= DELETE ================= */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID missing",
      });
    }

    // move children to root (safe)
    await Category.updateMany(
      { parentCategory: id },
      { parentCategory: null }
    );

    const deleted = await Category.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.json({ success: true });

  } catch (error) {
    console.error("DELETE CATEGORY ERROR:", error);
    return res.status(500).json({ success: false });
  }
};