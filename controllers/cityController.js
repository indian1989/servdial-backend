import City from "../models/City.js";
import memoryCache from "../utils/memoryCache.js";

import {
  normalizeCity,
  validateCity,
  fetchCoordinates,
} from "../utils/cityUtils.js";

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
   ADD CITY (STRICT + GEO SAFE)
========================================================= */
export const addCity = async (req, res) => {
  try {
    let city = normalizeCity(req.body);

    // ✅ STRICT VALIDATION (NO PARTIAL DATA)
    if (
      !city.name ||
      !city.district ||
      !city.state ||
      isNaN(city.latitude) ||
      isNaN(city.longitude)
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields including latitude & longitude are required",
      });
    }

    validateCity(city);

    // ✅ OPTIONAL FALLBACK (if frontend ever fails)
    city = await fetchCoordinates(city);

    // ❌ STILL INVALID → HARD FAIL
    if (isNaN(city.latitude) || isNaN(city.longitude)) {
      return res.status(400).json({
        success: false,
        message: "Valid coordinates required",
      });
    }

    // ✅ PREVENT DUPLICATE
    const exists = await City.findOne({
      name: city.name,
      state: city.state,
      district: city.district,
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "City already exists",
      });
    }

    // ✅ GEO SYNC (IMPORTANT)
    city.location = {
      type: "Point",
      coordinates: [city.longitude, city.latitude],
    };

    const created = await City.create(city);

    clearCityCache();

    return res.status(201).json({
      success: true,
      data: created,
    });

  } catch (error) {
    console.error("addCity error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create city",
    });
  }
};

/* =========================================================
   UPDATE CITY
========================================================= */
export const updateCity = async (req, res) => {
  try {
    const { id } = req.params;

    let city = normalizeCity(req.body);

    // ✅ STRICT VALIDATION
    if (
      !city.name ||
      !city.district ||
      !city.state ||
      isNaN(city.latitude) ||
      isNaN(city.longitude)
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields including latitude & longitude are required",
      });
    }

    // ✅ OPTIONAL: still allow auto-fetch fallback
    city = await fetchCoordinates(city);

    // ❌ still invalid → reject
    if (isNaN(city.latitude) || isNaN(city.longitude)) {
      return res.status(400).json({
        success: false,
        message: "Valid coordinates required",
      });
    }

    // ✅ SYNC LOCATION (IMPORTANT - no pre-save here)
    city.location = {
      type: "Point",
      coordinates: [city.longitude, city.latitude],
    };

    const updated = await City.findByIdAndUpdate(
      id,
      city,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false });
    }

    clearCityCache();

    return res.json({
      success: true,
      data: updated,
    });

  } catch (error) {
    console.error("updateCity error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Update failed",
    });
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
   BULK UPLOAD (STRICT + GEO SAFE)
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

    const processed = [];
    const skipped = [];

    for (let raw of cities) {
      try {
        let city = normalizeCity(raw);

        // ✅ STRICT VALIDATION
        if (
          !city.name ||
          !city.district ||
          !city.state ||
          isNaN(city.latitude) ||
          isNaN(city.longitude)
        ) {
          // try auto-fetch fallback
          city = await fetchCoordinates(city);
        }

        // ❌ STILL INVALID → SKIP
        if (
          !city.name ||
          !city.district ||
          !city.state ||
          isNaN(city.latitude) ||
          isNaN(city.longitude)
        ) {
          skipped.push(raw?.name || "unknown");
          continue;
        }

        validateCity(city);

        // ✅ GEO SYNC (IMPORTANT)
        city.location = {
          type: "Point",
          coordinates: [city.longitude, city.latitude],
        };

        processed.push(city);

      } catch (err) {
        skipped.push(raw?.name || "unknown");
        console.warn("Skipped:", raw?.name);
      }
    }

    let insertedCount = 0;

    try {
      const result = await City.insertMany(processed, {
        ordered: false, // ✅ continues even if duplicates exist
      });

      insertedCount = result.length;
    } catch (err) {
      // ✅ Ignore duplicate errors but count valid inserts
      if (err?.insertedDocs) {
        insertedCount = err.insertedDocs.length;
      }
      console.warn("Partial insert (duplicates skipped)");
    }

    clearCityCache();

    return res.json({
      success: true,
      inserted: insertedCount,
      skipped: skipped.length,
    });

  } catch (error) {
    console.error("bulkUploadCities error:", error);
    res.status(500).json({
      success: false,
      message: "Bulk upload failed",
    });
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