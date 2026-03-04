import Business from "../models/Business.js";
import asyncHandler from "express-async-handler";

// ================= Role Check Helper =================
const checkAdmin = (user) => ["admin", "superadmin"].includes(user.role);

// ================= CREATE Business =================
export const createBusiness = asyncHandler(async (req, res) => {

  if (!["provider", "admin", "superadmin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to create business",
    });
  }

  const ownerId = req.user._id;

  // Auto status logic
  const status =
    req.user.role === "provider" ? "pending" : "approved";

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

// ================= GET All Businesses =================
export const getBusinesses = asyncHandler(async (req, res) => {
  const { city, category, search, page = 1, limit = 10 } = req.query;

  //Define query
  let query = { status: "approved" };

  if (city) query.city = city;
  if (category) query.category = category;
  if (search) query.$text = { $search: search };

  //Fetch business with pagination
  const businesses = await Business.find(query)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

    //Total matching records
    const total = await Business.countDocuments(query);

    res.status(200).json({
    success: true,
    count: businesses.length,
    total, //total matching records
    page: Number(page),
    limit: Number(limit),
    businesses,
  });
});

// ================= GET Single Business =================
export const getBusinessById = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business)
    return res.status(404).json({ success: false, message: "Business not found" });

  res.status(200).json({ success: true, business });
});

// ================= UPDATE Business =================
export const updateBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business)
    return res.status(404).json({ success: false, message: "Business not found" });

  // Only owner or admin/superadmin can update
  if (!business.owner.equals(req.user._id) && !checkAdmin(req.user))
    return res.status(403).json({ success: false, message: "Not authorized" });

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

  if (!business)
    return res.status(404).json({ success: false, message: "Business not found" });

  // Only owner or admin/superadmin can delete
  if (!business.owner.equals(req.user._id) && !checkAdmin(req.user))
    return res.status(403).json({ success: false, message: "Not authorized" });

  await business.remove();

  res.status(200).json({ success: true, message: "Business deleted successfully" });
});

// ================= PAID FEATURES CHECK =================
export const paidFeatureNotice = asyncHandler(async (req, res) => {
  res.status(403).json({
    success: false,
    message: "This feature will be available soon",
  });
});
