import Business from "../models/Business.js";
import asyncHandler from "express-async-handler";

/*
GET ALL BUSINESSES (ADMIN)
*/
export const getAllBusinessesAdmin = asyncHandler(async (req, res) => {

  const businesses = await Business.find()
    .populate("owner", "name email")
    .sort({ createdAt: -1 });

  res.json(businesses);

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

  res.json(business);

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

  res.json(business);

});

/*
DELETE BUSINESS
*/
export const deleteBusinessAdmin = asyncHandler(async (req, res) => {

  await Business.findByIdAndDelete(req.params.id);

  res.json({ message: "Business deleted successfully" });

});

/*
TOGGLE FEATURED
*/
export const toggleFeatured = asyncHandler(async (req, res) => {

  const business = await Business.findById(req.params.id);

  business.isFeatured = !business.isFeatured;

  await business.save();

  res.json(business);

});