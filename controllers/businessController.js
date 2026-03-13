import Business from "../models/Business.js";
import asyncHandler from "express-async-handler";
import { uploadImage } from "../utils/uploadToCloudinary.js";

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

  let imageUrl = "";

  // Upload image to Cloudinary
  if (req.file) {
    const result = await uploadImage(req.file.buffer);
    imageUrl = result.secure_url;
  }

  const business = new Business({
    ...req.body,
    owner: ownerId,
    status,
    image: imageUrl
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
export const suggestSearch = async (req, res) => {

  const { q } = req.query;

  if(!q){
    return res.json({ suggestions: [] });
  }

  try{

    const categories = await Business.distinct("category", {
      category: new RegExp(q, "i")
    });

    res.json({
      suggestions: categories.slice(0,8)
    });

  }catch(err){
    res.status(500).json({
      message:"Suggestion error"
    });
  }

};

// ================= Paid Feature Placeholder =================
export const paidFeatureNotice = asyncHandler(async (req, res) => {

  res.status(403).json({
    success: false,
    message: "This feature will be available soon",
  });

});

// ============= Featured Business ==================
export const getFeaturedBusinesses = asyncHandler(async (req, res) => {

  const limit = Number(req.query.limit) || 8;

  const businesses = await Business.find({
    status: "approved",
    featured: true
  })
    .sort({ rating: -1 })
    .limit(limit);

  res.status(200).json({
    success: true,
    businesses
  });

});

// =============== Top Rated Business ================
export const getTopRatedBusinesses = asyncHandler(async (req, res) => {

  const limit = Number(req.query.limit) || 8;

  const businesses = await Business.find({
    status: "approved"
  })
    .sort({ rating: -1 })
    .limit(limit);

  res.status(200).json({
    success: true,
    businesses
  });

});

// ================== Nearby Businesses ===============
export const getNearbyBusinesses = asyncHandler(async (req, res) => {

  const { lat, lng, limit = 8 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      message: "Latitude and longitude required"
    });
  }

  const businesses = await Business.find({
    status: "approved"
  }).limit(Number(limit));

  res.status(200).json({
    success: true,
    businesses
  });

});