import City from "../models/City.js";
import slugify from "../utils/slugify.js";

/* ================= GET ALL CITIES ================= */
export const getCities = async (req, res) => {
  try {
    const { search, state, status } = req.query;

    let query = {};

    if (state) query.state = state;
    if (status) query.status = status;

    // 🔍 SEARCH SUPPORT
    if (search) {
      query.$text = { $search: search };
    }

    const cities = await City.find(query)
      .sort({ state: 1, district: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: cities.length,
      cities,
    });

  } catch (error) {
    console.error("GET CITIES ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


/* ================= ADD CITY ================= */
export const addCity = async (req, res) => {
  try {
    const { name, state, district, latitude, longitude } = req.body;

    if (!name || !state) {
      return res.status(400).json({
        success: false,
        message: "City name and state are required",
      });
    }

    // ✅ CASE-INSENSITIVE CHECK
    const existing = await City.findOne({
      name: new RegExp(`^${name}$`, "i"),
      state: new RegExp(`^${state}$`, "i"),
      district: district
        ? new RegExp(`^${district}$`, "i")
        : { $exists: true },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "City already exists in this state/district",
      });
    }

    const city = await City.create({
      name: name.trim(),
      state: state.trim(),
      district: district || "",
      latitude,
      longitude,
    });

    res.status(201).json({
      success: true,
      message: "City added successfully",
      city,
    });

  } catch (error) {
    console.error("ADD CITY ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


/* ================= UPDATE CITY ================= */
export const updateCity = async (req, res) => {
  try {
    const { id } = req.params;

    const city = await City.findById(id);

    if (!city) {
      return res.status(404).json({
        success: false,
        message: "City not found",
      });
    }

    // ✅ Update fields safely
    const updates = { ...req.body };

    if (updates.name) {
      updates.slug = slugify(updates.name);
    }

    const updatedCity = await City.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "City updated successfully",
      city: updatedCity,
    });

  } catch (error) {
    console.error("UPDATE CITY ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


/* ================= DELETE CITY ================= */
export const deleteCity = async (req, res) => {
  try {
    const { id } = req.params;

    const city = await City.findById(id);

    if (!city) {
      return res.status(404).json({
        success: false,
        message: "City not found",
      });
    }

    await city.deleteOne();

    res.json({
      success: true,
      message: "City deleted successfully",
    });

  } catch (error) {
    console.error("DELETE CITY ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


/* ================= TOGGLE STATUS ================= */
export const toggleCityStatus = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);

    if (!city) {
      return res.status(404).json({
        success: false,
        message: "City not found",
      });
    }

    city.status = city.status === "active" ? "inactive" : "active";
    await city.save();

    res.json({
      success: true,
      message: `City ${city.status}`,
      city,
    });

  } catch (error) {
    console.error("TOGGLE CITY STATUS ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


/* ================= GET FEATURED CITIES ================= */
export const getFeaturedCities = async (req, res) => {
  try {
    const cities = await City.find({
      featured: true,
      status: "active",
    })
      .sort({ name: 1 })
      .limit(12);

    res.status(200).json({
      success: true,
      count: cities.length,
      cities,
    });

  } catch (error) {
    console.error("FEATURED CITY ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


/* ================= MARK CITY AS FEATURED ================= */
export const markCityAsFeatured = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);

    if (!city) {
      return res.status(404).json({
        success: false,
        message: "City not found",
      });
    }

    city.featured = true;
    await city.save();

    res.json({
      success: true,
      message: `${city.name} marked as featured`,
      city,
    });

  } catch (error) {
    console.error("MARK FEATURED CITY ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


/* ================= UNMARK CITY ================= */
export const unmarkCityAsFeatured = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);

    if (!city) {
      return res.status(404).json({
        success: false,
        message: "City not found",
      });
    }

    city.featured = false;
    await city.save();

    res.json({
      success: true,
      message: `${city.name} removed from featured`,
      city,
    });

  } catch (error) {
    console.error("UNMARK FEATURED CITY ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};