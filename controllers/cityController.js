import City from "../models/City.js";

/* ================= GET ALL CITIES ================= */

export const getCities = async (req, res) => {
  try {

    const cities = await City.find().sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: cities.length,
      cities
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};


/* ================= ADD CITY ================= */

export const addCity = async (req, res) => {
  try {

    const { name, state } = req.body;

    const city = await City.create({
      name,
      state
    });

    res.status(201).json({
      success: true,
      city
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

/* ================= GET FEATURED CITIES ================= */

export const getFeaturedCities = async (req, res) => {
  try {

    const cities = await City.find({ featured: true })
      .sort({ name: 1 })
      .limit(12);

    res.status(200).json({
      success: true,
      count: cities.length,
      cities
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

/* =========================
   MARK CITY AS FEATURED
========================= */
export const markCityAsFeatured = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);

    if (!city) {
      return res.status(404).json({ success: false, message: "City not found" });
    }

    city.featured = true;
    await city.save();

    res.json({ success: true, message: `${city.name} marked as featured` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================
   UNMARK CITY AS FEATURED
========================= */
export const unmarkCityAsFeatured = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);

    if (!city) {
      return res.status(404).json({ success: false, message: "City not found" });
    }

    city.featured = false;
    await city.save();

    res.json({ success: true, message: `${city.name} removed from featured` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};