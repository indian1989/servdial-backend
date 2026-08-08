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

  console.log("PROVIDER LOGIN ID:", ownerId);


  const businesses = await Business.find({
    owner: ownerId
  })
  .sort({ createdAt: -1 });


  console.log(
    "PROVIDER BUSINESSES FOUND:",
    businesses.map(b => ({
      id: b._id,
      name: b.name,
      owner: b.owner,
      status: b.status,
      claimStatus: b.claimStatus
    }))
  );


  const categories = await Category.find();

  const categoriesMap = {};

  categories.forEach((cat) => {
    categoriesMap[cat._id.toString()] = cat.name;
  });


  const businessesWithCategoryNames = businesses.map((biz) => ({
    ...biz._doc,

    categoryName:
      categoriesMap[biz.categoryId?.toString()] ||
      biz.categoryId,
  }));


  res.json({
    success: true,
    count: businessesWithCategoryNames.length,
    businesses: businessesWithCategoryNames
  });

});

// ================================
// GET SINGLE PROVIDER BUSINESS
// ================================
export const getProviderBusinessById = asyncHandler(async (req, res) => {

  const business = await Business.findOne({
    _id: req.params.id,
    owner: req.user._id,
  })
  .populate(
    "categoryId",
    "name slug uiType features"
  )
  .populate(
    "cityId",
    "name slug"
  );

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  res.json({
    success: true,
    business,
  });

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
// UPDATE PROVIDER LEAD STATUS
// ================================
export const updateProviderLeadStatus = asyncHandler(
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "new",
      "contacted",
      "follow_up",
      "converted",
      "closed",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead status",
      });
    }

    // Find lead
    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // Find business
    const business = await Business.findById(lead.business)
      .select("_id owner name");

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    // Provider ownership security
    if (
      String(business.owner) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this lead",
      });
    }

    // Update status
    lead.status = status;

    // Contact tracking
    if (status === "contacted") {
      lead.lastContactedAt = new Date();
    }

    // Converted lead is also considered contacted
    if (status === "converted") {
      if (!lead.lastContactedAt) {
        lead.lastContactedAt = new Date();
      }
    }

    // Closed tracking
    if (status === "closed") {
      lead.closedAt = new Date();
    } else {
      lead.closedAt = null;
    }

    // Cancelled tracking
    if (status === "cancelled") {
      lead.cancelledAt = new Date();
    } else {
      lead.cancelledAt = null;
    }

    await lead.save();

    const updatedLead = await Lead.findById(lead._id)
      .populate("business", "name cityId")
      .populate("userId", "name email phone");

    res.status(200).json({
      success: true,
      message: "Lead status updated successfully",
      lead: updatedLead,
    });
  }
);


// ================================
// UPDATE PROVIDER LEAD NOTES
// ================================
export const updateProviderLeadNotes = asyncHandler(
  async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // Find business
    const business = await Business.findById(lead.business)
      .select("_id owner name");

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    // Provider ownership security
    if (
      String(business.owner) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this lead",
      });
    }

    lead.notes = notes || "";

    await lead.save();

    const updatedLead = await Lead.findById(lead._id)
      .populate("business", "name cityId")
      .populate("userId", "name email phone");

    res.status(200).json({
      success: true,
      message: "Lead notes updated successfully",
      lead: updatedLead,
    });
  }
);


// ================================
// CLOSE PROVIDER LEAD
// ================================
export const closeProviderLead = asyncHandler(
  async (req, res) => {
    const { id } = req.params;

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    const business = await Business.findById(lead.business)
      .select("_id owner name");

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    // Provider ownership security
    if (
      String(business.owner) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to close this lead",
      });
    }

    lead.status = "closed";
    lead.closedAt = new Date();
    lead.cancelledAt = null;

    await lead.save();

    res.status(200).json({
      success: true,
      message: "Lead closed successfully",
      lead,
    });
  }
);


// ================================
// CANCEL PROVIDER LEAD
// ================================
export const cancelProviderLead = asyncHandler(
  async (req, res) => {
    const { id } = req.params;

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    const business = await Business.findById(lead.business)
      .select("_id owner name");

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    // Provider ownership security
    if (
      String(business.owner) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this lead",
      });
    }

    lead.status = "cancelled";
    lead.cancelledAt = new Date();
    lead.closedAt = null;

    await lead.save();

    res.status(200).json({
      success: true,
      message: "Lead cancelled successfully",
      lead,
    });
  }
);


// ================================
// GET PROVIDER LEADS
// ================================
export const getProviderLeads = asyncHandler(async (req, res) => {

  const providerId = req.user._id;

  // ================================
  // PROVIDER BUSINESSES
  // ================================
  const businesses = await Business.find({
    owner: providerId,
  })
    .select("_id name slug")
    .lean();

  const businessIds = businesses.map(
    (business) => business._id
  );

  // No businesses
  if (businessIds.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      stats: {
        total: 0,
        new: 0,
        contacted: 0,
        follow_up: 0,
        converted: 0,
        closed: 0,
        cancelled: 0,
      },
      leads: [],
    });
  }

  // ================================
  // LEADS
  // ================================
  const leads = await Lead.find({
    business: {
      $in: businessIds,
    },
  })
    .populate(
      "business",
      "name slug cityId cityName"
    )
    .populate(
      "userId",
      "name email phone"
    )
    .sort({
      createdAt: -1,
    })
    .lean();

  // ================================
  // STATS
  // ================================
  const stats = {
    total: leads.length,

    new: leads.filter(
      (lead) => lead.status === "new"
    ).length,

    contacted: leads.filter(
      (lead) => lead.status === "contacted"
    ).length,

    follow_up: leads.filter(
      (lead) => lead.status === "follow_up"
    ).length,

    converted: leads.filter(
      (lead) => lead.status === "converted"
    ).length,

    closed: leads.filter(
      (lead) => lead.status === "closed"
    ).length,

    cancelled: leads.filter(
      (lead) => lead.status === "cancelled"
    ).length,
  };

  // ================================
  // RESPONSE
  // ================================
  res.status(200).json({
    success: true,
    count: leads.length,
    stats,
    leads,
  });

});


// ================================
// GET PROVIDER REVIEWS
// ================================
export const getProviderReviews = asyncHandler(async (req, res) => {

  const providerId = req.user._id;

  // ================================
  // FIND PROVIDER BUSINESSES
  // ================================
  const businesses = await Business.find({
    owner: providerId,
  })
    .select("_id")
    .lean();

  const businessIds = businesses.map(
    (business) => business._id
  );

  // ================================
  // NO BUSINESSES
  // ================================
  if (businessIds.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      reviews: [],
    });
  }

  // ================================
  // FIND REVIEWS
  // ================================
  const reviews = await Review.find({
    business: {
      $in: businessIds,
    },
  })
    .populate(
      "business",
      "name slug"
    )
    .sort({
      createdAt: -1,
    })
    .limit(100)
    .lean();

  // ================================
  // RESPONSE
  // ================================
  res.status(200).json({
    success: true,
    count: reviews.length,
    reviews,
  });

});


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