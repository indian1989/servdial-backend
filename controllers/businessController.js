//backend/controllers/businessController.js
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import Business from "../models/Business.js";
import { pingGoogleSitemap } from "../utils/pingSitemap.js";

import {
  createBusiness,
} from "./business/createBusinessController.js";

export {
  createBusiness,
};

import {
  updateBusiness,
} from "./business/updateBusinessController.js";

export {
  updateBusiness,
};

import {
  getBusinessBySlug,
} from "./business/getBusinessController.js";

export {
  getBusinessBySlug,
};

import {
  getBusinesses,
  getBusinessById,
} from "./business/businessReadController.js";

export {
  getBusinesses,
  getBusinessById,
};

import {
  updateBusinessHours,
  claimBusiness,
} from "./business/businessActionController.js";

export {
  updateBusinessHours,
  claimBusiness,
};

import {
  trackBusinessView,
  trackBusinessAnalytics,
} from "./business/businessAnalyticsController.js";

export {
  trackBusinessView,
  trackBusinessAnalytics,
};

import {
  getSimilarBusinesses,
  getLatestBusinesses,
} from "./business/businessDiscoveryController.js";

export {
  getSimilarBusinesses,
  getLatestBusinesses,
};

/* =========================
   CORE VALIDATION HELPERS
========================= */

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);


/* =========================
   DELETE BUSINESS
========================= */

export const deleteBusiness = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // ✅ Validate ID
  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid business id",
    });
  }

  const deleted = await Business.findByIdAndDelete(id);

  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  await pingGoogleSitemap();

  res.json({
    success: true,
    message: "Business deleted successfully",
    data: null,
  });
});

// ================================
// MANAGE BUSINESS MEDIA
// ================================
export const updateBusinessMedia = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({
  success: false,
  message: "Business not found",
});
  }

  business.images = req.body.images || business.images;
  await business.save();

  res.json({
  success: true,
  message: "Business media updated",
  data: business.images,
});
});

// ================= GET BUSINESS COUNT =================
export const getBusinessCount = asyncHandler(async (req, res) => {
  const { categoryId, cityId } = req.query;

  const filter = {
    status: "approved",
    isDeleted: false,
  };

  if (categoryId) filter.categoryId = categoryId;
  if (cityId) filter.cityId = cityId;

  const count = await Business.countDocuments(filter);

  res.json({
    success: true,
    data: { count },
  });
});