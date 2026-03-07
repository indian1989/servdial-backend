import Category from "../models/Category.js";

// ================= GET ALL =================
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= CREATE =================
export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    const existing = await Category.findOne({ name });

    if (existing) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = new Category({ name });

    await category.save();

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= UPDATE =================
export const updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name },
      { new: true }
    );

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= DELETE =================
export const deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);

    res.json({ message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};