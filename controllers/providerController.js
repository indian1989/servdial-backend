// backend/controllers/providerController.js
import asyncHandler from "express-async-handler";
import Business from "../models/Business.js";
import Review from "../models/Review.js";
import Lead from "../models/Lead.js";
import Category from "../models/Category.js";
import User from "../models/User.js";
import Message from "../models/Message.js"; // provider messages
import Notification from "../models/Notification.js"; // provider notifications
import Offer from "../models/Offer.js"; // provider offers
import Subscription from "../models/Subscription.js"; // provider subscriptions

// ================================
// GET PROVIDER DASHBOARD STATS
// ================================
export const getProviderDashboardStats = asyncHandler(async (req, res) => {
  const ownerId = req.user._id;

  const totalBusinesses = await Business.countDocuments({ owner: ownerId });
  const totalLeads = await Lead.countDocuments({
    business: { $in: await Business.find({ owner: ownerId }).select("_id") },
  });

  const pendingBusinesses = await Business.countDocuments({ owner: ownerId, status: "pending" });
  const approvedBusinesses = await Business.countDocuments({ owner: ownerId, status: "approved" });

  res.json({
    success: true,
    stats: { totalBusinesses, pendingBusinesses, approvedBusinesses, totalLeads },
  });
});

// ================================
// GET PROVIDER BUSINESSES
// ================================
export const getProviderBusinesses = asyncHandler(async (req, res) => {
  const ownerId = req.user._id;

  const businesses = await Business.find({ owner: ownerId }).sort({ createdAt: -1 });

  const categories = await Category.find();
  const categoriesMap = {};
  categories.forEach((cat) => { categoriesMap[cat._id] = cat.name; });

  const businessesWithCategoryNames = businesses.map((biz) => ({
    ...biz._doc,
    categoryName: categoriesMap[biz.category] || biz.category,
  }));

  res.json({ success: true, count: businessesWithCategoryNames.length, businesses: businessesWithCategoryNames });
});

// ================================
// EDIT BUSINESS
// ================================
export const editBusiness = asyncHandler(async (req, res) => {
  const ownerId = req.user._id;

  const business = await Business.findById(req.params.id);
  if (!business) {
    res.status(404);
    throw new Error("Business not found");
  }

  if (!business.owner.equals(ownerId)) {
    res.status(403);
    throw new Error("Not authorized");
  }

  Object.assign(business, req.body);
  await business.save();

  res.json({ success: true, message: "Business updated successfully", business });
});


// ================================
// PROVIDER MESSAGES
// ================================
export const getProviderMessages = asyncHandler(async (req, res) => {
  const messages = await Message.find({ provider: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, count: messages.length, messages });
});

// ================================
// PROVIDER NOTIFICATIONS
// ================================
export const getProviderNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, count: notifications.length, notifications });
});

// ================================
// PROVIDER OFFERS
// ================================
export const getProviderOffers = asyncHandler(async (req, res) => {
  const offers = await Offer.find({ provider: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, count: offers.length, offers });
});

// ================================
// PROVIDER PROFILE
// ================================
export const getProviderProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  if (!user) { res.status(404); throw new Error("User not found"); }
  res.json({ success: true, user });
});

// ================================
// PROVIDER SUBSCRIPTION
// ================================
export const getProviderSubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({ user: req.user._id });
  res.json({ success: true, subscription });
});

// ================================
// TRACK BUSINESS VIEWS
// ================================
export const trackBusinessView = asyncHandler(async (req, res) => {
  const business = await Business.findByIdAndUpdate(
    req.params.id,
    { $inc: { views: 1 } },
    { new: true }
  );
  res.json({ success: true, business });
});

// ================================
// GET PROVIDER ANALYTICS
// ================================
export const getProviderAnalytics = async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Provider analytics data"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================================
// GET PROVIDER LEADS
// ================================
export const getProviderLeads = async (req, res) => {
  try {

    const providerId = req.user.id; // from auth middleware

    // Example logic (replace with your Lead model)
    const leads = await Lead.find({ provider: providerId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({
      success: true,
      count: leads.length,
      leads
    });

  } catch (error) {
    console.error("Error fetching provider leads:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch leads"
    });
  }
};

// ================================
// GET PROVIDER REVIEWS
// ================================
export const getProviderReviews = async (req, res) => {
  try {
    const providerId = req.user.id;

    // Find businesses owned by this provider
    const businesses = await Business.find({ owner: providerId })
      .select("_id")
      .lean();

    const businessIds = businesses.map(b => b._id);

    // Get reviews for those businesses
    const reviews = await Review.find({
      business: { $in: businessIds }
    })
      .populate("business", "name slug")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews
    });

  } catch (error) {
    console.error("Error fetching provider reviews:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews"
    });
  }
};
// ================================
// GET PROVIDER SETTINGS
// ================================
export const getProviderSettings = async (req, res) => {
  try {
    const providerId = req.user.id;

    const provider = await User.findById(providerId)
      .select("name email phone avatar role createdAt")
      .lean();

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found"
      });
    }

    res.status(200).json({
      success: true,
      provider
    });

  } catch (error) {
    console.error("Error fetching provider settings:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch provider settings"
    });
  }
};