import City from "../models/City.js";
import Category from "../models/Category.js";

export const createCity = async (req, res) => {
  const { city, state } = req.body;

  // Duplication check
  const existing = await City.findOne({ city, state });
  if (existing) return res.status(400).json({ message: "City already exists" });

  const newCity = await City.create({ city, state });
  res.status(201).json({ city: newCity.city, state: newCity.state });
};

export const createCategory = async (req, res) => {
  const { category } = req.body;

  // Duplication check
  const existing = await Category.findOne({ category });
  if (existing) return res.status(400).json({ message: "Category already exists" });

  const newCategory = await Category.create({ category });
  res.status(201).json({ category: newCategory.category });
};