// backend/controllers/adminBusnessController.js
import Business from "../models/Business.js";
import asyncHandler from "express-async-handler";

/*
GET ALL BUSINESSES (ADMIN)
*/
export const getAllBusinessesAdmin = asyncHandler(async (req, res) => {
  const businesses = await Business.find()
    .populate("owner", "name email")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    message: "Businesses fetched successfully",
    total: businesses.length,
    businesses,
  });
});

/*
APPROVE BUSINESS
*/
export const approveBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findByIdAndUpdate(
    req.params.id,
    { status: "approved" },
    { new: true }
  );

  if (!business) {
    return res.status(404).json({ success: false, message: "Business not found" });
  }

  res.json({ success: true, message: "Business approved", business });
});

/*
REJECT BUSINESS
*/
export const rejectBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findByIdAndUpdate(
    req.params.id,
    { status: "rejected" },
    { new: true }
  );

  if (!business) {
    return res.status(404).json({ success: false, message: "Business not found" });
  }

  res.json({ success: true, message: "Business rejected", business });
});

/*
DELETE BUSINESS
*/
export const deleteBusinessAdmin = asyncHandler(async (req, res) => {
  const business = await Business.findByIdAndDelete(req.params.id);

  if (!business) {
    return res.status(404).json({ success: false, message: "Business not found" });
  }

  res.json({ success: true, message: "Business deleted successfully" });
});

/*
TOGGLE FEATURED
*/
export const toggleFeatured = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({ success: false, message: "Business not found" });
  }

  business.isFeatured = !business.isFeatured; // ✅ FIXED FIELD

  await business.save();

  res.json({ success: true, message: "Featured status updated", business });
});