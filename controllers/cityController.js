import mongoose from "mongoose";
import City from "../models/City.js";
import { geocodeCity } from "../services/geocodeService.js";

import {
  createCityService,
  getCitiesService,
  deleteCityService,
  updateCityService,
  featureCityService,
  getStatesService,
  getDistrictsService,
  getCitiesByDistrictService,
} from "../services/cityService.js";

/* ================= VALIDATION ================= */
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/* ================= FALLBACK LOCATION ================= */
const DEFAULT_LOCATION = {
  latitude: 20.5937,
  longitude: 78.9629, // India center fallback
};

const buildLocation = (lat, lng) => {
  if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
    return {
      latitude: Number(lat),
      longitude: Number(lng),
      location: {
        type: "Point",
        coordinates: [Number(lng), Number(lat)],
      },
    };
  }

  return {
    ...DEFAULT_LOCATION,
    location: {
      type: "Point",
      coordinates: [
        DEFAULT_LOCATION.longitude,
        DEFAULT_LOCATION.latitude,
      ],
    },
  };
};

/* ================= GET CITIES ================= */
export const getCities = async (req, res) => {
  try {
    const result = await getCitiesService(req.query);

    res.json({
      success: true,
      cities: result.cities || [],
      total: result.total || 0,
      page: result.page || 1,
      pages: result.pages || 1,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

/* ================= ADD CITY ================= */
export const addCity = async (req, res) => {
  try {
    let geo = null;
    const { latitude, longitude } = req.body;

    // 1. Use manual coordinates if available
    if (latitude && longitude) {
      geo = buildLocation(latitude, longitude);
    } else {
      // 2. Try geocoding
      try {
        geo = await geocodeCity({
          name: req.body.name,
          district: req.body.district,
          state: req.body.state,
        });
      } catch (err) {
        console.warn("Geocode failed, using fallback location");
        geo = buildLocation();
      }
    }

    const city = await City.create({
      ...req.body,
      ...geo,
    });

    res.status(201).json({
      success: true,
      data: city,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

/* ================= UPDATE CITY ================= */
export const bulkUploadCities = async (req, res) => {
  try {
    const cities = req.body.cities || [];

    let inserted = 0;
    let failed = 0;

    for (const city of cities) {
      try {
        await createCityService(city); // 🔥 IMPORTANT (auto enrich)
        inserted++;
      } catch (err) {
        failed++;
      }
    }

    res.json({
      success: true,
      inserted,
      failedCount: failed,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ================= UPDATE CITY ================= */
export const updateCity = async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid city ID",
    });
  }

  try {
    let geo = null;
    const { latitude, longitude } = req.body;

    // 1. manual coords
    if (latitude && longitude) {
      geo = buildLocation(latitude, longitude);
    } else {
      // 2. geocode fallback
      try {
        geo = await geocodeCity({
          name: req.body.name,
          district: req.body.district,
          state: req.body.state,
        });
      } catch (err) {
        geo = buildLocation();
      }
    }

    const updatedCity = await City.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        ...geo,
      },
      { new: true }
    );

    res.json({
      success: true,
      data: updatedCity,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

/* ================= DELETE CITY ================= */
export const deleteCity = async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid city ID",
    });
  }

  try {
    await deleteCityService(req.params.id);

    res.json({
      success: true,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

/* ================= FEATURE CITY ================= */
export const markCityAsFeatured = async (req, res) => {
  try {
    const city = await featureCityService(req.params.id, 10);

    res.json({
      success: true,
      data: city,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

export const unmarkCityAsFeatured = async (req, res) => {
  try {
    const city = await featureCityService(req.params.id, 0);

    res.json({
      success: true,
      data: city,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

/* ================= META DATA ================= */
export const getStates = async (req, res) => {
  try {
    const states = await getStatesService();

    res.json({
      success: true,
      data: states,
      meta: {
        total: states.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

export const getDistrictsByState = async (req, res) => {
  try {
    const districts = await getDistrictsService(req.params.stateSlug);

    res.json({
      success: true,
      data: districts,
      meta: {
        total: districts.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

export const getCitiesByDistrict = async (req, res) => {
  try {
    const cities = await getCitiesByDistrictService(req.params.districtSlug);

    res.json({
      success: true,
      data: cities,
      meta: {
        total: cities.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};