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