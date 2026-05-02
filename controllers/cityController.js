import City from "../models/City.js";
import slugify from "../utils/slugify.js";
import memoryCache from "../utils/memoryCache.js";

/* =========================================================
   CORE HELPERS
========================================================= */

const clearCityCache = () => {
  memoryCache.del("cities:all");
  memoryCache.del("cities:trending");
};

/* =========================================================
   GET CITIES (ADMIN EXPECTED)
   alias of getAllCities (keeps route compatibility)
========================================================= */
export const getCities = async (req, res) => {
  try {
    const cacheKey = "cities:all";

    const cached = memoryCache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const cities = await City.find({})
      .sort({ name: 1 })
      .lean();

    memoryCache.set(cacheKey, cities, 60 * 60 * 6);

    return res.json({ success: true, data: cities });
  } catch (error) {
    console.error("getCities error:", error);
    res.status(500).json({ success: false });
  }
};

/* =========================================================
   ADMIN GET ALL (EXTRA COMPAT LAYER)
========================================================= */
export const getAllCitiesAdmin = async (req, res) => {
  return getCities(req, res);
};

/* =========================================================
   ADD CITY
========================================================= */
export const addCity = async (req, res) => {
  try {
    const { name, state, district, location } = req.body;

    // ✅ validation
    if (!name || !state || !district) {
      return res.status(400).json({
        success: false,
        message: "Name, state and district are required",
      });
    }

    // ⚠️ DO NOT manually generate slug here
    // Schema will handle it (IMPORTANT FIX)

    const exists = await City.findOne({
      name: name.trim(),
      state: state.trim(),
      district: district.trim(),
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "City already exists",
      });
    }

    const city = await City.create({
      name: name.trim(),
      state: state.trim(),
      district: district.trim(),
      location: location || null,
    });

    clearCityCache();

    return res.status(201).json({
      success: true,
      data: city,
    });

  } catch (error) {
    console.error("addCity error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create city",
    });
  }
};

/* =========================================================
   UPDATE CITY
========================================================= */
export const updateCity = async (req, res) => {
  try {
    const { id } = req.params;

    const city = await City.findById(id);
    if (!city) {
      return res.status(404).json({ success: false });
    }

    const { name, state, district, location, status } = req.body;

    if (name && name !== city.name) {
      city.slug = slugify(name);
      city.name = name;
    }

    if (state !== undefined) city.state = state;
    if (district !== undefined) city.district = district;
    if (location !== undefined) city.location = location;
    if (status) city.status = status;

    await city.save();

    clearCityCache();

    return res.json({ success: true, data: city });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

/* =========================================================
   DELETE CITY
========================================================= */
export const deleteCity = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);

    if (!city) {
      return res.status(404).json({ success: false });
    }

    await city.deleteOne();

    clearCityCache();

    return res.json({
      success: true,
      message: "City deleted",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

/* =========================================================
   BULK UPLOAD (SAFE STUB - FIXES YOUR ERROR)
========================================================= */
export const bulkUploadCities = async (req, res) => {
  try {
    const cities = req.body?.cities || [];

    if (!Array.isArray(cities)) {
      return res.status(400).json({
        success: false,
        message: "Invalid data format",
      });
    }

    const formatted = cities.map((c) => ({
  name: c.name,
  state: c.state,
  district: c.district,
  location: c.location || null,
}));

    await City.insertMany(formatted);

    clearCityCache();

    return res.json({
      success: true,
      message: "Bulk upload successful",
    });
  } catch (error) {
    console.error("bulkUploadCities error:", error);
    res.status(500).json({ success: false });
  }
};

/* =========================================================
   FILTER HELPERS (ADMIN ROUTES REQUIRE THESE)
========================================================= */
export const getStates = async (req, res) => {
  try {
    const states = await City.distinct("state");
    res.json({ success: true, data: states });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

export const getDistrictsByState = async (req, res) => {
  try {
    const { state } = req.params;

    const districts = await City.distinct("district", {
      state,
    });

    res.json({ success: true, data: districts });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

export const getCitiesByDistrict = async (req, res) => {
  try {
    const { district } = req.params;

    const cities = await City.find({ district }).lean();

    res.json({ success: true, data: cities });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

/* =========================================================
   FEATURED CITIES
========================================================= */
export const getFeaturedCities = async (req, res) => {
  try {
    const cities = await City.find({ featured: true })
      .sort({ name: 1 })
      .lean();

    res.json({ success: true, data: cities });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

export const markCityAsFeatured = async (req, res) => {
  try {
    const { id } = req.params;

    await City.findByIdAndUpdate(id, { featured: true });

    clearCityCache();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

export const unmarkCityAsFeatured = async (req, res) => {
  try {
    const { id } = req.params;

    await City.findByIdAndUpdate(id, { featured: false });

    clearCityCache();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

/* =========================================================
   PUBLIC HELPERS
========================================================= */
export const getCityBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const city = await City.findOne({ slug, status: "active" }).lean();

    if (!city) {
      return res.status(404).json({
        success: false,
        message: "City not found",
      });
    }

    res.json({ success: true, data: city });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

export const getTrendingCities = async (req, res) => {
  try {
    const cities = await City.find({ status: "active" })
      .sort({ name: 1 })
      .limit(12)
      .lean();

    res.json({ success: true, data: cities });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

/* =========================================================
   BACKWARD COMPAT ALIASES (SAFETY LAYER)
========================================================= */
export const getAllCities = getCities;