// backend/controllers/cityController.js
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

import mongoose from "mongoose";

// 🚨 IMPORTANT:
// City slug resolution MUST happen inside cityService
// Controller should NEVER resolve slugs directly

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/* ================= GET ================= */
export const getCities = async (req, res) => {
  try {
    const result = await getCitiesService(req.query);

    res.json({
      success: true,
      cities: result.cities || [],   // ✅ FIXED
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

/* ================= CREATE ================= */
export const addCity = async (req, res) => {
  try {
    const city = await createCityService(req.body);
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

/* ================= UPDATE ================= */
export const updateCity = async (req, res) => {
  
  if (!isValidId(req.params.id)) {
  return res.status(400).json({
    success: false,
    message: "Invalid city ID",
  });
}

  try {
    const city = await updateCityService(req.params.id, req.body);
    res.json({
  success: true,
  data: city,
  meta: {
    timestamp: new Date().toISOString(),
  },
});

deleteCache(`city:slug:${city.slug}`);
deleteCache(`city:id:${city._id}`);

  } catch (err) {
    res.status(500).json({
  success: false,
  message: err.message || "Server error",
});
  }
};

/* ================= DELETE ================= */
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

deleteCache(`city:slug:${city.slug}`);
deleteCache(`city:id:${city._id}`);

  } catch (err) {
    res.status(500).json({
  success: false,
  message: err.message || "Server error",
});
  }
};

/* ================= FEATURE ================= */
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

/* ================= META ================= */
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