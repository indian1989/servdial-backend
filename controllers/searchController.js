import Business from "../models/Business.js";

export const searchBusinesses = async (req, res) => {
  try {
    const { city, category } = req.query;

    let filter = {};

    if (city) filter.city = city;
    if (category) filter.category = category;

    const businesses = await Business.find(filter)
      .populate("category")
      .populate("city");

    res.json(businesses);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Search failed" });
  }
};