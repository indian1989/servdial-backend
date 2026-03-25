import Category from "../models/Category.js";

/* ================= GET ALL ================= */
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .populate("parentCategory", "_id name")
      .sort({ order: 1, name: 1 })
      .lean();

    const map = {};
    const roots = [];

    categories.forEach((cat) => {
      map[cat._id] = { ...cat, subcategories: [] };
    });

    categories.forEach((cat) => {
      const parentId = cat.parentCategory?._id || cat.parentCategory;

      if (parentId && map[parentId]) {
        map[parentId].subcategories.push(map[cat._id]);
      } else {
        roots.push(map[cat._id]);
      }
    });

    const sortTree = (nodes) => {
      nodes.sort(
        (a, b) =>
          Number(a.order || 0) - Number(b.order || 0) ||
          a.name.localeCompare(b.name)
      );
      nodes.forEach((n) => sortTree(n.subcategories));
    };

    sortTree(roots);

    res.json({
      success: true,
      categories: roots,
      flatCategories: categories,
      total: categories.length,
    });

  } catch (error) {
    console.error("GET ALL CATEGORIES ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};


/* ================= GET BY SLUG ================= */
export const getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({
      slug: req.params.slug,
      status: "active",
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


/* ================= TRENDING ================= */
export const getTrendingCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      isTrending: true, // ⚠️ make sure schema has this
      status: "active",
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
      description,
      status: "active",
    });

    res.json({
      success: true,
      category,
    });

  } catch (error) {
    console.error("CREATE CATEGORY ERROR:", error);
    res.status(500).json({
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

    res.json({ success: true, category });

  } catch (error) {
    console.error("UPDATE CATEGORY ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* ================= DELETE ================= */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    await Category.updateMany(
      { parentCategory: id },
      { parentCategory: null }
    );

    await Category.findByIdAndDelete(id);

    res.json({ success: true });

  } catch (error) {
    console.error("DELETE CATEGORY ERROR:", error);
    res.status(500).json({ success: false });
  }
};