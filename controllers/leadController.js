import asyncHandler from "express-async-handler";
import Lead from "../models/Lead.js";
import Business from "../models/Business.js";

// ================= CREATE LEAD =================
export const createLead = asyncHandler(async (req, res) => {
  const { businessId, name, phone, message, email } = req.body;

  const business = await Business.findById(businessId);

  if (!business) {
    res.status(404);
    throw new Error("Business not found");
  }

  const lead = await Lead.create({
    business: businessId,
    name,
    phone,
    email,
    message,
    city: business.city,
  });

  res.status(201).json({
    success: true,
    lead,
  });
});

// ================= GET BUSINESS LEADS =================
export const getBusinessLeads = asyncHandler(async (req, res) => {

  const leads = await Lead.find({ business: req.params.businessId })
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    leads,
  });

});

// ================= ADMIN ALL LEADS =================
export const getAllLeads = asyncHandler(async (req, res) => {

  const leads = await Lead.find()
    .populate("business")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    leads,
  });

});