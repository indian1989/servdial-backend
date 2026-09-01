import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";

import SystemSettings from "../models/SystemSettings.js";
import ActivityLogs from "../models/ActivityLogs.js";
import Business from "../models/Business.js";
import Category from "../models/Category.js";
import City from "../models/City.js";
import User from "../models/User.js";
import Lead from "../models/Lead.js";
import Banner from "../models/Banner.js";

/* ======================================================
   GET ADMIN BUSINESSES (OPTIONAL LIST VIEW ONLY)
   - READ ONLY (NO STATUS LOGIC HERE)
====================================================== */
export const getAdminBusinesses = asyncHandler(async (req, res) => {
  console.log("ADMIN QUERY PARAMS:", req.query);

  const {
    city,
    category,
    search,
    page = 1,
    limit = 20,
  } = req.query;

  const query = {};

  if (city) query.cityId = city;
  if (category) query.categoryId = category;

  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  const businesses = await Business.find(query, null, {
    includeAll: true,
  })
    .populate("owner", "name email role")
    .populate("categoryId", "name")
    .sort({ createdAt: -1 })
    .skip((page - 1) * Number(limit))
    .limit(Number(limit));

  const total = await Business.countDocuments(query);

  res.json({
    success: true,
    data: businesses,
    meta: {
      total,
      page: Number(page),
    },
  });
});

/* ======================================================
   DASHBOARD STATS
====================================================== */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const users = await User.countDocuments({
    role: { $in: ["user", "provider"] },
  });

  const admins = await User.countDocuments({
    role: { $in: ["admin", "superadmin"] },
  });

  const cities = await City.countDocuments();
  const categories = await Category.countDocuments();
  const businesses = await Business.countDocuments();

  res.json({
    success: true,
    stats: {
      users,
      admins,
      cities,
      categories,
      businesses,
    },
  });
});

/* ======================================================
   ANALYTICS
   SINGLE SOURCE FOR ADMIN ANALYTICS
====================================================== */
export const getAnalytics = asyncHandler(async (req, res) => {
  const now = new Date();

  /* =====================================================
     1. BASIC COUNTS
  ===================================================== */

  const [
    totalUsers,
    totalProviders,
    totalAdmins,
    totalCities,
    totalCategories,
    totalBusinesses,
    totalLeads,

    pendingBusinesses,
    featuredBusinesses,

    totalBanners,
    approvedBanners,
    pendingBanners,
    rejectedBanners,

    paidBanners,
    unpaidBanners,

    activeBanners,
    inactiveBanners,

    expiredBanners,
    scheduledBanners,

    providerBanners,
    adminBanners,
    superadminBanners,

    bannerClicksResult,

    businessByCategory,
    businessByCity,
    businessByStatus,
    bannersByPlacement,
  ] = await Promise.all([

    /* ================= USERS ================= */

    User.countDocuments({
      role: "user",
    }),

    User.countDocuments({
      role: "provider",
    }),

    User.countDocuments({
      role: {
        $in: ["admin", "superadmin"],
      },
    }),

    /* ================= LOCATION ================= */

    City.countDocuments(),

    Category.countDocuments(),

    /* ================= BUSINESSES ================= */

    Business.countDocuments(),

    /* ================= LEADS ================= */

    Lead.countDocuments(),

    /* ================= BUSINESS STATUS ================= */

    Business.countDocuments({
      status: "pending",
    }),

    Business.countDocuments({
      isFeatured: true,
    }),

    /* =================================================
       BANNERS
    ================================================= */

    Banner.countDocuments(),

    Banner.countDocuments({
      status: "approved",
    }),

    Banner.countDocuments({
      status: "pending",
    }),

    Banner.countDocuments({
      status: "rejected",
    }),

    /* ================= PAYMENT ================= */

    Banner.countDocuments({
      paymentStatus: "paid",
    }),

    Banner.countDocuments({
      paymentStatus: {
        $ne: "paid",
      },
    }),

    /* ================= ACTIVE ================= */

    Banner.countDocuments({
      status: "approved",
      isActive: true,

      $or: [
        {
          paymentStatus: "paid",
        },
        {
          role: {
            $in: ["admin", "superadmin"],
          },
        },
      ],

      $and: [
        {
          $or: [
            {
              startDate: {
                $lte: now,
              },
            },
            {
              startDate: null,
            },
            {
              startDate: {
                $exists: false,
              },
            },
          ],
        },
        {
          $or: [
            {
              endDate: {
                $gte: now,
              },
            },
            {
              endDate: null,
            },
            {
              endDate: {
                $exists: false,
              },
            },
          ],
        },
      ],
    }),

    Banner.countDocuments({
      isActive: false,
    }),

    /* ================= EXPIRED ================= */

    Banner.countDocuments({
      endDate: {
        $lt: now,
      },
    }),

    /* ================= SCHEDULED ================= */

    Banner.countDocuments({
      startDate: {
        $gt: now,
      },
    }),

    /* ================= BANNER ROLES ================= */

    Banner.countDocuments({
      role: "provider",
    }),

    Banner.countDocuments({
      role: "admin",
    }),

    Banner.countDocuments({
      role: "superadmin",
    }),

    /* ================= CLICKS ================= */

    Banner.aggregate([
      {
        $group: {
          _id: null,
          totalClicks: {
            $sum: {
              $ifNull: ["$clicks", 0],
            },
          },
        },
      },
    ]),

    /* =================================================
       BUSINESS BY CATEGORY
    ================================================= */

    Business.aggregate([
      {
        $group: {
          _id: "$categoryId",
          count: {
            $sum: 1,
          },
        },
      },

      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },

      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 0,

          category: {
            $ifNull: [
              "$category.name",
              "Uncategorized",
            ],
          },

          count: 1,
        },
      },

      {
        $sort: {
          count: -1,
        },
      },
    ]),

    /* =================================================
       BUSINESS BY CITY
    ================================================= */

    Business.aggregate([
      {
        $group: {
          _id: "$cityId",
          count: {
            $sum: 1,
          },
        },
      },

      {
        $lookup: {
          from: "cities",
          localField: "_id",
          foreignField: "_id",
          as: "city",
        },
      },

      {
        $unwind: {
          path: "$city",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 0,

          city: {
            $ifNull: [
              "$city.name",
              "Unknown City",
            ],
          },

          count: 1,
        },
      },

      {
        $sort: {
          count: -1,
        },
      },
    ]),

    /* =================================================
       BUSINESS BY STATUS
    ================================================= */

    Business.aggregate([
      {
        $group: {
          _id: {
            $ifNull: [
              "$status",
              "unknown",
            ],
          },

          count: {
            $sum: 1,
          },
        },
      },

      {
        $project: {
          _id: 0,

          status: "$_id",

          count: 1,
        },
      },

      {
        $sort: {
          count: -1,
        },
      },
    ]),

    /* =================================================
       BANNER BY PLACEMENT
    ================================================= */

    Banner.aggregate([
      {
        $group: {
          _id: "$placement",

          count: {
            $sum: 1,
          },

          clicks: {
            $sum: {
              $ifNull: [
                "$clicks",
                0,
              ],
            },
          },
        },
      },

      {
        $project: {
          _id: 0,

          placement: "$_id",

          count: 1,

          clicks: 1,
        },
      },

      {
        $sort: {
          count: -1,
        },
      },
    ]),
  ]);


  /* =====================================================
     CLICKS
  ===================================================== */

  const totalBannerClicks =
    bannerClicksResult?.[0]?.totalClicks || 0;


  /* =====================================================
     USERS TOTAL
  ===================================================== */

  const totalUsersIncludingAdmins =
    totalUsers +
    totalProviders +
    totalAdmins;


  /* =====================================================
     BUSINESS ACTIVE
  ===================================================== */

  const activeBusinesses = Math.max(
    totalBusinesses -
      pendingBusinesses,
    0
  );


  /* =====================================================
     RESPONSE
  ===================================================== */

  res.json({
    success: true,

    data: {

      /* ================= USERS ================= */

      users: {
        total: totalUsersIncludingAdmins,

        regular: totalUsers,

        providers: totalProviders,

        admins: totalAdmins,
      },


      /* ================= BUSINESSES ================= */

      businesses: {
        total: totalBusinesses,

        active: activeBusinesses,

        pending: pendingBusinesses,

        featured: featuredBusinesses,

        status: businessByStatus,
      },


      /* ================= LOCATION ================= */

      cities: {
        total: totalCities,
      },


      categories: {
        total: totalCategories,
      },


      /* ================= LEADS ================= */

      leads: {
        total: totalLeads,
      },


      /* ================= BANNERS ================= */

      banners: {

        total: totalBanners,

        approved: approvedBanners,

        pending: pendingBanners,

        rejected: rejectedBanners,

        paid: paidBanners,

        unpaid: unpaidBanners,

        active: activeBanners,

        inactive: inactiveBanners,

        expired: expiredBanners,

        scheduled: scheduledBanners,

        provider: providerBanners,

        admin: adminBanners,

        superadmin: superadminBanners,

        clicks: totalBannerClicks,

        byPlacement: bannersByPlacement,
      },


      /* ================= CHART DATA ================= */

      businessByCategory,

      businessByCity,

      businessByStatus,

    },


    meta: {
      generatedAt: now,
    },
  });
});


// ======================================================
// UPDATE ADMIN LEAD STATUS
// ======================================================

export const updateAdminLeadStatus = asyncHandler(
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

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // ================================
    // STATUS
    // ================================

    lead.status = status;

    // ================================
    // CONTACT TRACKING
    // ================================

    if (
      status === "contacted" ||
      status === "converted"
    ) {
      if (!lead.lastContactedAt) {
        lead.lastContactedAt = new Date();
      }
    }

    // ================================
    // CLOSED TRACKING
    // ================================

    if (status === "closed") {
      lead.closedAt = new Date();
      lead.cancelledAt = null;
    }

    // ================================
    // CANCELLED TRACKING
    // ================================

    if (status === "cancelled") {
      lead.cancelledAt = new Date();
      lead.closedAt = null;
    }

    // ================================
    // REOPEN / OTHER STATUS
    // ================================

    if (
      status !== "closed" &&
      status !== "cancelled"
    ) {
      lead.closedAt = null;
      lead.cancelledAt = null;
    }

    await lead.save();

    const updatedLead = await Lead.findById(lead._id)
      .populate(
        "business",
        "name slug cityId cityName owner"
      )
      .populate(
        "userId",
        "name email phone"
      );

    res.status(200).json({
      success: true,
      message: "Lead status updated successfully",
      lead: updatedLead,
    });
  }
);


// ======================================================
// UPDATE ADMIN LEAD NOTES
// ======================================================

export const updateAdminLeadNotes = asyncHandler(
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

    lead.notes = notes || "";

    await lead.save();

    const updatedLead = await Lead.findById(lead._id)
      .populate(
        "business",
        "name slug cityId cityName owner"
      )
      .populate(
        "userId",
        "name email phone"
      );

    res.status(200).json({
      success: true,
      message: "Lead notes updated successfully",
      lead: updatedLead,
    });
  }
);

/* ======================================================
   REPORTS
====================================================== */
export const getReports = async (req, res) => {
  try {
    const businesses = await Business.find()
      .populate("cityId", "name slug")
      .populate("categoryId", "name slug");

    res.json({
      success: true,
      data: businesses,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
      error: err.message,
    });
  }
};

/* ======================================================
   SYSTEM SETTINGS
====================================================== */
export const getSystemSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.find();

  res.json({
    success: true,
    data: settings,
  });
});

/* ======================================================
   UPDATE SYSTEM SETTINGS
====================================================== */
export const updateSystemSettings = asyncHandler(
  async (req, res) => {
    const {
      siteName,
      siteLogo,
      contactEmail,
      contactPhone,
      maintenanceMode,
      footerText,
      socialLinks,
    } = req.body;

    // ====================================================
    // VALIDATION
    // ====================================================

    if (!contactEmail?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Contact email is required.",
      });
    }

    // ====================================================
    // FIND EXISTING SETTINGS
    // ====================================================

    let settings = await SystemSettings.findOne();

    // ====================================================
    // CREATE SETTINGS
    // ====================================================

    if (!settings) {
      settings = new SystemSettings({
        siteName:
          siteName?.trim() || "ServDial",

        siteLogo:
          siteLogo || "",

        contactEmail:
          contactEmail.trim(),

        contactPhone:
          contactPhone || "",

        maintenanceMode:
          Boolean(maintenanceMode),

        footerText:
          footerText || "",

        socialLinks: {
          facebook:
            socialLinks?.facebook || "",

          twitter:
            socialLinks?.twitter || "",

          instagram:
            socialLinks?.instagram || "",

          linkedin:
            socialLinks?.linkedin || "",
        },

        createdBy:
          req.user?._id,

        updatedBy:
          req.user?._id,
      });
    }

    // ====================================================
    // UPDATE EXISTING SETTINGS
    // ====================================================

    else {
      settings.siteName =
        siteName?.trim() ||
        settings.siteName;

      settings.siteLogo =
        siteLogo ??
        settings.siteLogo;

      settings.contactEmail =
        contactEmail.trim();

      settings.contactPhone =
        contactPhone ??
        settings.contactPhone;

      settings.maintenanceMode =
        maintenanceMode ??
        settings.maintenanceMode;

      settings.footerText =
        footerText ??
        settings.footerText;

      settings.socialLinks = {
        facebook:
          socialLinks?.facebook ??
          settings.socialLinks?.facebook ??
          "",

        twitter:
          socialLinks?.twitter ??
          settings.socialLinks?.twitter ??
          "",

        instagram:
          socialLinks?.instagram ??
          settings.socialLinks?.instagram ??
          "",

        linkedin:
          socialLinks?.linkedin ??
          settings.socialLinks?.linkedin ??
          "",
      };

      settings.updatedBy =
        req.user?._id;
    }

    // ====================================================
    // SAVE
    // ====================================================

    await settings.save();

    // ====================================================
    // RESPONSE
    // ====================================================

    res.json({
      success: true,

      message:
        "System settings updated successfully",

      data: settings,
    });
  }
);

/* ======================================================
   ACTIVITY LOGS
====================================================== */
export const getActivityLogs = asyncHandler(async (req, res) => {
  const logs = await ActivityLogs.find()
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({
    success: true,
    data: logs,
  });
});

/* ======================================================
   PASSWORD CHANGE
====================================================== */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  const match = await bcrypt.compare(currentPassword, user.password);

  if (!match) {
    return res.status(400).json({
      success: false,
      message: "Current password incorrect",
    });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({
    success: true,
    message: "Password updated",
  });
});

/* ======================================================
   USERS
====================================================== */
export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password");

  res.json({
    success: true,
    data: users,
  });
});


/* ======================================================
   DELETE USER
====================================================== */
export const deleteUser = asyncHandler(async (req, res) => {

  const user = await User.findById(req.params.id);


  if (!user) {

    res.status(404);

    throw new Error(
      "User not found"
    );

  }


  // safety: admin खुद को delete ना कर सके
  if (
    user._id.toString() === req.user._id.toString()
  ) {

    res.status(400);

    throw new Error(
      "You cannot delete your own account"
    );

  }


  await user.deleteOne();


  res.json({

    success:true,

    message:"User deleted successfully"

  });


});

/* ======================================================
   ADMINS
====================================================== */
export const getAdmins = asyncHandler(async (req, res) => {
  const { role } = req.query;

  const query = {
    role: { $in: ["admin", "superadmin"] },
  };

  if (role) {
    query.role = role;
  }

  const admins = await User.find(query)
    .select("-password")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: admins,
  });
});

/* ======================================================
   CATEGORY
====================================================== */
export const createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;

  const existing = await Category.findOne({ name });

  if (existing) {
    return res.status(400).json({
      success: false,
      message: "Category already exists",
    });
  }

  const category = await Category.create({ name });

  res.status(201).json({
    success: true,
    data: category,
  });
});