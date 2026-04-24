import asyncHandler from "express-async-handler";
import Lead from "../models/Lead.js";
import Business from "../models/Business.js";

// ================= CREATE LEAD =================
export const createLead = asyncHandler(async (req, res) => {
  const { businessId, name, phone, message, email } = req.body;

  if (!businessId || !name || !phone) {
    return res.status(400).json({ success: false, message: "Required fields missing" });
  }

  const business = await Business.findById(businessId);

  if (!business) {
    return res.status(404).json({ success: false, message: "Business not found" });
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
    message: "Lead created successfully",
    lead,
  });
});

// ================= GET BUSINESS LEADS =================
export const getBusinessLeads = asyncHandler(async (req, res) => {
  const leads = await Lead.find({ business: req.params.businessId })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: leads.length,
    leads,
  });
});

// ================= ADMIN ALL LEADS =================
export const getAllLeads = asyncHandler(async (req, res) => {
  const leads = await Lead.find()
    .populate("business", "name cityId")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: leads.length,
    leads,
  });
});