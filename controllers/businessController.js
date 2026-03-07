import Business from "../models/Business.js";
import asyncHandler from "express-async-handler";

// ================= Role Check =================
const isAdmin = (user) =>
  ["admin", "superadmin"].includes(user.role);


// ================= CREATE Business =================
export const createBusiness = asyncHandler(async (req, res) => {

  if (!["provider", "admin", "superadmin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to create business",
    });
  }

  const ownerId = req.user._id;

  const status =
    req.user.role === "provider"
      ? "pending"
      : "approved";

  const business = new Business({
    ...req.body,
    owner: ownerId,
    status,
  });

  await business.save();

  res.status(201).json({
    success: true,
    message: "Business created successfully",
    business,
  });
});


// ================= GET Businesses (Search + Filters) =================
export const getBusinesses = asyncHandler(async (req, res) => {

  const {
    city,
    category,
    search,
    page = 1,
    limit = 12,
    sort = "latest",
  } = req.query;

  let query = { status: "approved" };

  if (city) {
    query.city = { $regex: city, $options: "i" };
  }

  if (category) {
    query.category = { $regex: category, $options: "i" };
  }

  if (search) {
    query.$text = { $search: search };
  }

  let sortOption = { createdAt: -1 };

  if (sort === "rating") {
    sortOption = { rating: -1 };
  }

  if (sort === "featured") {
    sortOption = { featured: -1 };
  }

  const businesses = await Business.find(query)
    .sort(sortOption)
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Business.countDocuments(query);

  res.status(200).json({
    success: true,
    page: Number(page),
    limit: Number(limit),
    total,
    businesses,
  });
});


// ================= GET Single Business =================
export const getBusinessById = asyncHandler(async (req, res) => {

  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  res.status(200).json({
    success: true,
    business,
  });
});


// ================= UPDATE Business =================
export const updateBusiness = asyncHandler(async (req, res) => {

  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  if (
    !business.owner.equals(req.user._id) &&
    !isAdmin(req.user)
  ) {
    return res.status(403).json({
      success: false,
      message: "Not authorized",
    });
  }

  Object.assign(business, req.body);

  await business.save();

  res.status(200).json({
    success: true,
    message: "Business updated successfully",
    business,
  });
});


// ================= DELETE Business =================
export const deleteBusiness = asyncHandler(async (req, res) => {

  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  if (
    !business.owner.equals(req.user._id) &&
    !isAdmin(req.user)
  ) {
    return res.status(403).json({
      success: false,
      message: "Not authorized",
    });
  }

  await business.deleteOne();

  res.status(200).json({
    success: true,
    message: "Business deleted successfully",
  });
});


// ================= SEARCH Businesses =================
export const searchBusinesses = asyncHandler(async (req, res) => {

  const { city, category, page = 1, limit = 12 } = req.query;

  const query = { status: "approved" };

  if (city) {
    query.city = new RegExp(city, "i");
  }

  if (category) {
    query.category = new RegExp(category, "i");
  }

  const businesses = await Business.find(query)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await Business.countDocuments(query);

  res.status(200).json({
    success: true,
    businesses,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  });
});


// ================= SEARCH SUGGESTIONS =================
export const suggestSearch = asyncHandler(async (req, res) => {

  const { q } = req.query;

  if (!q) {
    return res.json({ suggestions: [] });
  }

  const categories = await Business.distinct("category", {
    category: new RegExp(q, "i"),
  });

  res.json({
    suggestions: categories.slice(0, 8),
  });

});


// ================= Paid Feature Placeholder =================
export const paidFeatureNotice = asyncHandler(async (req, res) => {

  res.status(403).json({
    success: false,
    message: "This feature will be available soon",
  });

});