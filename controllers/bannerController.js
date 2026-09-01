import mongoose from "mongoose";
import Banner from "../models/Banner.js";
import Business from "../models/Business.js";
import Payment from "../models/Payment.js";

// =====================================================
// BANNER PRICING
// =====================================================
// Server-side source of truth.
// Price is determined by placement.
// Do not accept banner price from frontend.

const BANNER_PRICES = {
  homepage_top: 1999,
  homepage_middle: 1799,
  homepage_bottom: 1299,

  city_page_top: 1599,
  city_page_middle: 1299,
  city_page_bottom: 1099,

  category_page_top: 1599,
  category_page_middle: 1299,
  category_page_bottom: 1099,

  featured_business_top: 1799,
  featured_business_bottom: 1299,

  top_rated_business_top: 1799,
  top_rated_business_bottom: 1299,

  latest_business_top: 1799,
  latest_business_bottom: 1299,

  search_results_top: 1999,
  search_results_bottom: 1599,

  business_detail_middle: 1599,
  business_detail_bottom: 1299,
};

/* =========================
   CREATE BANNER
========================= */
export const createBanner = async (req, res) => {
  try {
    const {
  title,
  image,
  link,
  placement,
  cityId,
  categoryId,
  businessId,
  durationMonths,
} = req.body;

    const role = req.user.role;

    const isAdmin =
      role === "admin" ||
      role === "superadmin";

    const isProvider =
      role === "provider";

    const isUser =
      role === "user";

    // ================= ROLE CHECK =================

    if (
      ![
        "user",
        "provider",
        "admin",
        "superadmin",
      ].includes(role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to create banners",
      });
    }

    // ================= BASIC VALIDATION =================

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Banner title is required",
      });
    }

    if (!image || !image.trim()) {
      return res.status(400).json({
        success: false,
        message: "Banner image is required",
      });
    }

    // ================= PLACEMENT VALIDATION =================

    const allowedPlacements = [
  // =========================
  // HOMEPAGE
  // =========================
  "homepage_top",
  "homepage_middle",
  "homepage_bottom",

  // =========================
  // CITY PAGE
  // =========================
  "city_page_top",
  "city_page_middle",
  "city_page_bottom",

  // =========================
  // CATEGORY PAGE
  // =========================
  "category_page_top",
  "category_page_middle",
  "category_page_bottom",

  // =========================
  // BUSINESS LISTING SECTIONS
  // =========================
  "featured_business_top",
  "featured_business_bottom",

  "top_rated_business_top",
  "top_rated_business_bottom",

  "latest_business_top",
  "latest_business_bottom",

  // =========================
  // SEARCH RESULTS
  // =========================
  "search_results_top",
  "search_results_bottom",

  // =========================
  // BUSINESS DETAIL PAGE
  // =========================
  "business_detail_middle",
  "business_detail_bottom",
];

    if (!allowedPlacements.includes(placement)) {
      return res.status(400).json({
        success: false,
        message: "Invalid placement",
      });
    }


    // ================= TARGETING =================
    // User + Provider banners are targeted.
    // Admin/Superadmin may create global banners.

    if (
      (isUser || isProvider) &&
      (!cityId || !categoryId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "cityId and categoryId are required for user and provider banners",
      });
    }

    // ================= OBJECT ID VALIDATION =================

    if (
      cityId &&
      !mongoose.Types.ObjectId.isValid(cityId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid cityId",
      });
    }

    if (
      categoryId &&
      !mongoose.Types.ObjectId.isValid(categoryId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid categoryId",
      });
    }

 // ================= BUSINESS VALIDATION =================

if (
  businessId &&
  !mongoose.Types.ObjectId.isValid(businessId)
) {
  return res.status(400).json({
    success: false,
    message: "Invalid businessId",
  });
}

// ================= BUSINESS TARGETING VALIDATION =================

const businessDetailPlacements = [
  "business_detail_middle",
  "business_detail_bottom",
];

// Business-detail banners MUST target a business.
if (
  businessDetailPlacements.includes(placement) &&
  !businessId
) {
  return res.status(400).json({
    success: false,
    message:
      "businessId is required for business detail banners",
  });
}

// Non-business-detail banners should not target a specific business.
if (
  !businessDetailPlacements.includes(placement) &&
  businessId
) {
  return res.status(400).json({
    success: false,
    message:
      "businessId is allowed only for business detail banners",
  });
}

// Validate business ID when provided.
if (businessId) {
  if (!mongoose.Types.ObjectId.isValid(businessId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid businessId",
    });
  }

  const business = await Business.findById(businessId)
    .select("_id owner");

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  // Provider can target ONLY their own business.
  if (
    isProvider &&
    (!business.owner ||
      business.owner.toString() !== req.user._id.toString())
  ) {
    return res.status(403).json({
      success: false,
      message:
        "Providers can target only their own businesses",
    });
  }
}

// ================= BANNER DURATION + PRICING =================
// Customer banner pricing is determined ONLY by placement + duration.
// Never trust price, basePrice, or discountPercent from frontend.

const basePrice = BANNER_PRICES[placement];

if (
  !isAdmin &&
  (!Number.isFinite(basePrice) || basePrice <= 0)
) {
  return res.status(400).json({
    success: false,
    message:
      "Banner price is not configured for this placement",
  });
}

// Admin banners are internal and do not require customer duration.
const finalDurationMonths = isAdmin
  ? 1
  : Number(durationMonths);

if (
  !isAdmin &&
  ![1, 3, 6, 12].includes(finalDurationMonths)
) {
  return res.status(400).json({
    success: false,
    message:
      "Invalid banner duration. Allowed durations are 1, 3, 6, and 12 months",
  });
}

// ================= DISCOUNT =================

const discountPercentMap = {
  1: 0,
  3: 5,
  6: 10,
  12: 15,
};

const discountPercent =
  isAdmin
    ? 0
    : discountPercentMap[finalDurationMonths];

const originalAmount =
  basePrice * finalDurationMonths;

const discountAmount =
  originalAmount *
  (discountPercent / 100);

const finalBannerPrice =
  Math.round(
    originalAmount - discountAmount
  );

    // ================= FINAL TARGETING =================

    const finalCityId =
      isAdmin
        ? (cityId || null)
        : cityId;

    const finalCategoryId =
      isAdmin
        ? (categoryId || null)
        : categoryId;

    // ================= DUPLICATE PENDING CHECK =================

    const existingPending =
  await Banner.findOne({
    createdBy: req.user._id,
    role,
    status: "pending",
  });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message:
          "You already have a pending banner",
      });
    }

    // ================= CREATE =================

    const banner = await Banner.create({
  title: title.trim(),
  image: image.trim(),
  link: link?.trim() || undefined,
  placement,

  price: isAdmin ? 0 : finalBannerPrice,

  basePrice: isAdmin ? 0 : basePrice,

  discountPercent: isAdmin
    ? 0
    : discountPercent,

  durationMonths: finalDurationMonths,

  cityId: finalCityId,
  categoryId: finalCategoryId,
  businessId: businessId || null,

  createdBy: req.user._id,
  role,

  // =========================
  // BANNER STATUS
  // =========================
  // Admin banners are immediately approved.
  // User/provider banners remain pending until
  // payment + admin approval are completed.

  status: isAdmin
    ? "approved"
    : "pending",

  paymentStatus: isAdmin
    ? "not_required"
    : "pending",

  // =========================
  // ACTIVE STATE
  // =========================
  // Draft/pending customer banners must NEVER
  // appear as Active.
  //
  // Admin banners are immediately live.
  // Customer banners become active only after approval.

  isActive: isAdmin
    ? true
    : false,

  approvedBy: isAdmin
    ? req.user._id
    : undefined,

  approvedAt: isAdmin
    ? new Date()
    : undefined,

  // Admin banners can start immediately.
  // Customer banner dates are assigned during approval.

  startDate: isAdmin
    ? new Date()
    : undefined,

  endDate: isAdmin
    ? (() => {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date;
      })()
    : undefined,
});

    return res.status(201).json({
      success: true,
      data: banner,
      meta: {
        status: isAdmin
          ? "auto-approved"
          : "pending",

        paymentStatus: isAdmin
  ? "not_required"
  : "pending",

        scope:
  finalCityId ||
  finalCategoryId ||
  businessId
    ? "TARGETED"
    : "GLOBAL",
      },
    });

  } catch (error) {
    console.error(
      "Create Banner Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create banner",
    });
  }
};


    /* =========================
   APPROVE BANNER
========================= */
export const approveBanner = async (req, res) => {
  try {
    // =========================
// ADMIN ROLE PROTECTION
// =========================

if (
  !["admin", "superadmin"].includes(req.user.role)
) {
  return res.status(403).json({
    success: false,
    message: "Only admin or superadmin can approve banners",
  });
}
    const banner = await Banner.findById(
      req.params.bannerId
    );

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    // ================= STATUS CHECK =================

if (banner.status === "approved") {
  return res.status(400).json({
    success: false,
    message: "Banner is already approved",
  });
}

if (banner.status === "rejected") {
  return res.status(400).json({
    success: false,
    message: "Rejected banner cannot be approved directly",
  });
}

    // ================= PAYMENT CHECK =================
    // User/provider banners require payment before approval.
    // Admin/superadmin internal banners are exempt.

    if (
      !["admin", "superadmin"].includes(
        banner.role
      ) &&
      banner.paymentStatus !== "paid"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Banner payment must be completed before approval",
      });
    }

    // =========================
// APPROVAL + LIVE PERIOD
// =========================

// Approval time becomes the actual live/start time.
const liveStartDate = new Date();

// Banner duration comes from the server-side value
// already stored on the banner.
const durationMonths =
  Number(banner.durationMonths) || 1;

// 30 days per month.
// 1 month = 30 days
// 3 months = 90 days
// 6 months = 180 days
// 12 months = 360 days
const liveDays =
  durationMonths * 30;

const liveEndDate =
  new Date(liveStartDate);

liveEndDate.setDate(
  liveEndDate.getDate() + liveDays
);

banner.status = "approved";

banner.paymentStatus =
  ["admin", "superadmin"].includes(banner.role)
    ? "not_required"
    : "paid";

banner.isActive = true;

banner.approvedBy =
  req.user._id;

banner.approvedAt =
  liveStartDate;

banner.startDate =
  liveStartDate;

banner.endDate =
  liveEndDate;

await banner.save();

    return res.json({
      success: true,
      data: banner,
      meta: {},
    });

  } catch (error) {
    console.error(
      "Approve Banner Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to approve banner",
    });
  }
};

/* =========================
   REJECT BANNER
   ADMIN / SUPERADMIN ONLY
========================= */
export const rejectBanner = async (req, res) => {
  try {
    // =========================
// ADMIN ROLE PROTECTION
// =========================

if (
  !["admin", "superadmin"].includes(req.user.role)
) {
  return res.status(403).json({
    success: false,
    message: "Only admin or superadmin can reject banners",
  });
}
    const banner = await Banner.findById(
      req.params.bannerId
    );

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    // ================= STATUS CHECK =================
    // Only pending banners should normally be rejected.
    // Already approved banners should not be rejected through
    // the approval workflow.

    if (banner.status !== "pending") {
  return res.status(400).json({
    success: false,
    message: `Banner with status "${banner.status}" cannot be rejected`,
  });
}

    // ================= REJECT =================

    banner.status = "rejected";

// Rejected banners must never remain active.
banner.isActive = false;

await banner.save();

    return res.json({
      success: true,
      data: banner,
      meta: {
        status: "rejected",
      },
    });

  } catch (error) {
    console.error(
      "Reject Banner Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to reject banner",
    });
  }
};

/* =========================
   GET ACTIVE BANNERS
   (PUBLIC + FILTERABLE)
========================= */
export const getBanners = async (req, res) => {
  try {
    const now = new Date();

    const {
  cityId,
  categoryId,
  businessId,
  placement
} = req.query;

    const baseFilter = {
      status: "approved",
      isActive: true,
      $or: [
  { paymentStatus: "paid" },
  { paymentStatus: "not_required" }
],
      $and: [
        {
          $or: [
            { startDate: { $lte: now } },
            { startDate: null },
            { startDate: { $exists: false } }
          ]
        },
        {
          $or: [
            { endDate: { $gte: now } },
            { endDate: null },
            { endDate: { $exists: false } }
          ]
        }
      ]
    };

    // CITY FILTER SAFE
    if (cityId) {
      baseFilter.$and.push({
        $or: [
          { cityId },
          { cityId: null }
        ]
      });
    }

    // CATEGORY FILTER SAFE
    if (categoryId) {
      baseFilter.$and.push({
        $or: [
          { categoryId },
          { categoryId: null }
        ]
      });
    }

    // BUSINESS FILTER SAFE
if (businessId) {
  if (!mongoose.Types.ObjectId.isValid(businessId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid businessId",
    });
  }

  baseFilter.$and.push({
    $or: [
      { businessId },
      { businessId: null }
    ]
  });
}

    if (placement) {
      baseFilter.placement = placement;
    }

    const banners = await Banner.find(baseFilter)
      .sort({ order: 1, createdAt: -1 })
      .lean()
      .select(
  "title image link placement cityId categoryId businessId order"
);

    return res.json({
      success: true,
      data: banners,
      meta: {
        total: banners.length
      }
    });

  } catch (error) {
    console.error("🔥 Banner API Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch banners"
    });
  }
};

/* =========================
   TRACK BANNER CLICK
   PUBLIC
========================= */

export const trackBannerClick = async (req, res) => {
  try {
    const { bannerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bannerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner ID",
      });
    }

    const banner = await Banner.findOneAndUpdate(
      {
        _id: bannerId,
        status: "approved",
        isActive: true,
      },
      {
        $inc: { clicks: 1 },
      },
      {
        new: true,
      }
    ).select("_id clicks");

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found or inactive",
      });
    }

    res.json({
      success: true,
      data: {
        bannerId: banner._id,
        clicks: banner.clicks,
      },
    });

  } catch (error) {
    console.error("Track Banner Click Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to track banner click",
    });
  }
};

/* =========================
   GET ALL BANNERS (ADMIN)
========================= */
export const getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.find()
      .populate("cityId", "name slug")
      .populate("categoryId", "name slug")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: banners,
      meta: {
        total: banners.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch banners",
    });
  }
};


/* =========================
   GET PROVIDER BANNERS
   PROVIDER ONLY
========================= */

export const getProviderBanners = async (req, res) => {
  try {
    const providerId = req.user._id;

    const banners = await Banner.find({
      createdBy: providerId,
      role: "provider",
    })
      .populate("cityId", "name slug")
      .populate("categoryId", "name slug")
      .populate("businessId", "name slug")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: banners,
      meta: {
        total: banners.length,
      },
    });
  } catch (error) {
    console.error(
      "Get Provider Banners Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch provider banners",
    });
  }
};


/* =========================
   UPDATE PROVIDER BANNER
   PROVIDER ONLY
========================= */

export const updateProviderBanner = async (req, res) => {
  try {
    const providerId = req.user._id;
    const { bannerId } = req.params;

    // =========================
    // BANNER ID VALIDATION
    // =========================

    if (
      !mongoose.Types.ObjectId.isValid(bannerId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner ID",
      });
    }

    // =========================
    // FIND OWN BANNER
    // =========================

    const banner = await Banner.findOne({
      _id: bannerId,
      createdBy: providerId,
      role: "provider",
    });

    if (!banner) {
      return res.status(404).json({
        success: false,
        message:
          "Banner not found or you are not authorized to update it",
      });
    }

    // =========================
    // PROTECTED PAID BANNER
    // =========================
    // Once provider banner is approved + paid,
    // provider cannot modify it.

    if (
      banner.status === "approved" &&
      banner.paymentStatus === "paid"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Cannot modify an approved paid banner",
      });
    }

    // =========================
    // INPUTS
    // =========================

    const {
  title,
  image,
  link,
  placement,
  cityId,
  categoryId,
  businessId,
  isActive,
  durationMonths,
} = req.body;

    // =========================
    // BASIC VALIDATION
    // =========================

    if (
      title !== undefined &&
      (!title || !title.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Banner title cannot be empty",
      });
    }

    if (
      image !== undefined &&
      (!image || !image.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Banner image cannot be empty",
      });
    }

    // =========================
    // ALLOWED PLACEMENTS
    // =========================

    const allowedPlacements = [
      // Homepage
      "homepage_top",
      "homepage_middle",
      "homepage_bottom",

      // City
      "city_page_top",
      "city_page_middle",
      "city_page_bottom",

      // Category
      "category_page_top",
      "category_page_middle",
      "category_page_bottom",

      // Business listing
      "featured_business_top",
      "featured_business_bottom",

      "top_rated_business_top",
      "top_rated_business_bottom",

      "latest_business_top",
      "latest_business_bottom",

      // Search
      "search_results_top",
      "search_results_bottom",

      // Business detail
      "business_detail_middle",
      "business_detail_bottom",
    ];

    if (
      placement !== undefined &&
      !allowedPlacements.includes(placement)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid placement",
      });
    }

    // =========================
    // FINAL VALUES
    // =========================

    const finalCityId =
      cityId !== undefined
        ? cityId
        : banner.cityId;

    const finalCategoryId =
      categoryId !== undefined
        ? categoryId
        : banner.categoryId;

    const finalBusinessId =
      businessId !== undefined
        ? businessId
        : banner.businessId;

    const finalPlacement =
      placement !== undefined
        ? placement
        : banner.placement;

    // =========================
    // PROVIDER TARGETING
    // =========================
    // Provider banners must always
    // have city + category.

    if (
      !finalCityId ||
      !finalCategoryId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "cityId and categoryId are required for provider banners",
      });
    }

    // =========================
    // OBJECT ID VALIDATION
    // =========================

    if (
      !mongoose.Types.ObjectId.isValid(
        finalCityId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid cityId",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        finalCategoryId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid categoryId",
      });
    }

    // =========================
    // BUSINESS DETAIL VALIDATION
    // =========================

    if (
      [
        "business_detail_middle",
        "business_detail_bottom",
      ].includes(finalPlacement) &&
      !finalBusinessId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "businessId is required for business detail banners",
      });
    }

    // Non-business-detail banners must NOT target a specific business.
if (
  ![
    "business_detail_middle",
    "business_detail_bottom",
  ].includes(finalPlacement) &&
  finalBusinessId
) {
  return res.status(400).json({
    success: false,
    message:
      "businessId is allowed only for business detail banners",
  });
}

    // =========================
    // BUSINESS ID VALIDATION
    // =========================

    if (finalBusinessId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          finalBusinessId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid businessId",
        });
      }

      const business =
  await Business.findById(finalBusinessId)
    .select("_id owner");

if (!business) {
  return res.status(404).json({
    success: false,
    message: "Business not found",
  });
}

// Provider can target ONLY their own business.
if (
  !business.owner ||
  business.owner.toString() !==
    providerId.toString()
) {
  return res.status(403).json({
    success: false,
    message:
      "Providers can target only their own businesses",
  });
}
    }

    // =========================
// BANNER DURATION + PRICING
// =========================
// Provider can change duration before the banner
// becomes an approved + paid banner.
// Price is always recalculated server-side.

const finalDurationMonths =
  durationMonths !== undefined
    ? Number(durationMonths)
    : Number(banner.durationMonths) || 1;

if (
  ![1, 3, 6, 12].includes(
    finalDurationMonths
  )
) {
  return res.status(400).json({
    success: false,
    message:
      "Invalid banner duration. Allowed durations are 1, 3, 6, and 12 months",
  });
}

// =========================
// SERVER-SIDE PRICING
// =========================

const basePrice =
  BANNER_PRICES[finalPlacement];

if (
  !Number.isFinite(basePrice) ||
  basePrice <= 0
) {
  return res.status(400).json({
    success: false,
    message:
      "Banner price is not configured for this placement",
  });
}

const discountPercentMap = {
  1: 0,
  3: 5,
  6: 10,
  12: 15,
};

const discountPercent =
  discountPercentMap[
    finalDurationMonths
  ];

const originalAmount =
  basePrice * finalDurationMonths;

const discountAmount =
  originalAmount *
  (discountPercent / 100);

const finalBannerPrice =
  Math.round(
    originalAmount - discountAmount
  );

    // =========================
    // UPDATE FIELDS
    // =========================

    if (title !== undefined) {
      banner.title = title.trim();
    }

    if (image !== undefined) {
      banner.image = image.trim();
    }

    if (link !== undefined) {
      banner.link =
        link.trim() || undefined;
    }

    if (placement !== undefined) {
      banner.placement = placement;
    }

    banner.cityId = finalCityId;
banner.categoryId = finalCategoryId;
banner.businessId =
  finalBusinessId || null;

// =========================
// UPDATE DURATION + PRICING
// =========================

banner.durationMonths =
  finalDurationMonths;

banner.basePrice =
  basePrice;

banner.discountPercent =
  discountPercent;

banner.price =
  finalBannerPrice;

if (isActive !== undefined) {
  banner.isActive = Boolean(isActive);
}

    // =========================
    // SAVE
    // =========================

    await banner.save();

    return res.json({
      success: true,
      data: banner,
      meta: {
        message:
          "Provider banner updated successfully",
      },
    });
  } catch (error) {
    console.error(
      "Update Provider Banner Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update provider banner",
    });
  }
};


/* =========================
   DELETE PROVIDER BANNER
   PROVIDER ONLY
========================= */

export const deleteProviderBanner = async (
  req,
  res
) => {
  try {
    const providerId = req.user._id;
    const { bannerId } = req.params;

    // =========================
    // BANNER ID VALIDATION
    // =========================

    if (
      !mongoose.Types.ObjectId.isValid(bannerId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner ID",
      });
    }

    // =========================
    // FIND OWN BANNER
    // =========================

    const banner = await Banner.findOne({
      _id: bannerId,
      createdBy: providerId,
      role: "provider",
    });

    if (!banner) {
      return res.status(404).json({
        success: false,
        message:
          "Banner not found or you are not authorized to delete it",
      });
    }

    // =========================
    // PROTECTED PAID BANNER
    // =========================
    // Provider cannot delete an approved
    // + paid banner.

    if (
      banner.status === "approved" &&
      banner.paymentStatus === "paid"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Cannot delete an approved paid banner",
      });
    }

    // =========================
    // DELETE
    // =========================

    await Banner.findByIdAndDelete(
      bannerId
    );

    return res.json({
      success: true,
      data: null,
      meta: {
        message:
          "Provider banner deleted successfully",
      },
    });
  } catch (error) {
    console.error(
      "Delete Provider Banner Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete provider banner",
    });
  }
};

/* =========================
   MARK BANNER PAID
   ADMIN / SUPERADMIN ONLY
========================= */
export const markBannerPaid = async (req, res) => {
  try {
    // =========================
// ADMIN ROLE PROTECTION
// =========================

if (
  !["admin", "superadmin"].includes(req.user.role)
) {
  return res.status(403).json({
    success: false,
    message:
      "Only admin or superadmin can mark banner payment as paid",
  });
}
    const { paymentId } = req.body;

    // =========================
    // BANNER ID VALIDATION
    // =========================

    const { bannerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bannerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner ID",
      });
    }

    // =========================
    // FIND BANNER
    // =========================

    const banner = await Banner.findById(bannerId);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    // =====================================================
    // INTERNAL ADMIN BANNER
    // =====================================================

    const isInternalAdminBanner =
      banner.role === "admin" ||
      banner.role === "superadmin";

    if (isInternalAdminBanner) {
      banner.paymentStatus = "not_required";
      banner.paymentId = undefined;

      await banner.save();

      return res.json({
        success: true,
        data: banner,
        meta: {
          paymentType: "internal",
          paymentStatus: "not_required",
        },
      });
    }

    // =====================================================
    // CUSTOMER BANNER
    // =====================================================

    if (
      banner.role !== "user" &&
      banner.role !== "provider"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner role",
      });
    }

    // =========================
    // PAYMENT ID REQUIRED
    // =========================

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message:
          "Payment ID is required for user/provider banners",
      });
    }

    // =========================
    // PAYMENT ID VALIDATION
    // =========================

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    // =========================
    // CENTRAL PAYMENT LOOKUP
    // =========================

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // =====================================================
    // PAYMENT MUST ALREADY BE SUCCESSFUL
    // =====================================================
    // Do not mark a banner paid merely because a Payment _id
    // was supplied. The central Payment record is the source
    // of truth.

    if (
      payment.status !== "paid" &&
      payment.status !== "completed" &&
      payment.status !== "success"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment is not completed",
      });
    }

    // =========================
    // SAVE CENTRAL PAYMENT _id
    // =========================
    // paymentId is an ObjectId reference, not a String.

    banner.paymentId = payment._id;
    banner.paymentStatus = "paid";

    await banner.save();

    return res.json({
      success: true,
      data: banner,
      meta: {
        paymentType: "customer",
        paymentStatus: "paid",
        paymentId: payment._id,
      },
    });

  } catch (error) {
    console.error(
      "Mark Banner Paid Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update payment",
    });
  }
};

/* =========================
   DELETE BANNER (Admin and Superadmin Only)
========================= */
export const deleteBanner = async (req, res) => {
  try {
    // =========================
// ADMIN ROLE PROTECTION
// =========================

if (
  !["admin", "superadmin"].includes(req.user.role)
) {
  return res.status(403).json({
    success: false,
    message:
      "Only admin or superadmin can delete banners",
  });
}
    const deleted = await Banner.findByIdAndDelete(req.params.bannerId);

if (!deleted) {
  return res.status(404).json({
    success: false,
    message: "Banner not found",
  });
}

    res.json({
  success: true,
  data: null,
  meta: {
    message: "Banner deleted"
  }
});
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete banner",
    });
  }
};

/* =========================
   UPDATE BANNER
========================= */
export const updateBanner = async (req, res) => {
  try {
    const {
  title,
  image,
  link,
  placement,
  cityId,
  categoryId,
  businessId,
  isActive,
  durationMonths
} = req.body;

    const role = req.user.role;
    const isAdmin = role === "admin" || role === "superadmin";

    const banner = await Banner.findById(req.params.bannerId);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    // ================= ROLE PROTECTION =================
if (
  ![
    "user",
    "provider",
    "admin",
    "superadmin",
  ].includes(role)
) {
  return res.status(403).json({
    success: false,
    message: "Not allowed to update banner",
  });
}

// ================= OWNERSHIP PROTECTION =================
// Users and providers may update only their own banners.
// Admins and superadmins may update any banner.

if (
  !isAdmin &&
  banner.createdBy?.toString() !==
    req.user._id.toString()
) {
  return res.status(403).json({
    success: false,
    message: "You can only update your own banner",
  });
}

    // ================= PROTECTED PAID BANNER =================
// User/provider cannot modify an approved + paid banner.
// Admin/superadmin may modify it.

if (
  !isAdmin &&
  banner.status === "approved" &&
  banner.paymentStatus === "paid"
) {
  return res.status(403).json({
    success: false,
    message:
      "Cannot modify approved paid banner",
  });
}

   // ================= TARGETING VALIDATION =================

const finalCityId =
  cityId !== undefined
    ? cityId
    : banner.cityId;

const finalCategoryId =
  categoryId !== undefined
    ? categoryId
    : banner.categoryId;

const finalBusinessId =
  businessId !== undefined
    ? businessId
    : banner.businessId;

// User + Provider banners must remain city + category targeted.
if (
  !isAdmin &&
  (!finalCityId || !finalCategoryId)
) {
  return res.status(400).json({
    success: false,
    message:
      "cityId and categoryId are required for user and provider banners",
  });
}

// Business detail banners must target a specific business.
const finalPlacement =
  placement !== undefined
    ? placement
    : banner.placement;

if (
  [
    "business_detail_middle",
    "business_detail_bottom",
  ].includes(finalPlacement) &&
  !finalBusinessId
) {
  return res.status(400).json({
    success: false,
    message:
      "businessId is required for business detail banners",
  });
}

// Non-business-detail banners must NOT target a specific business.
if (
  ![
    "business_detail_middle",
    "business_detail_bottom",
  ].includes(finalPlacement) &&
  finalBusinessId
) {
  return res.status(400).json({
    success: false,
    message:
      "businessId is allowed only for business detail banners",
  });
}

// ================= BASIC VALIDATION =================

if (
  title !== undefined &&
  (!title || !title.trim())
) {
  return res.status(400).json({
    success: false,
    message: "Banner title cannot be empty",
  });
}

if (
  image !== undefined &&
  (!image || !image.trim())
) {
  return res.status(400).json({
    success: false,
    message: "Banner image cannot be empty",
  });
}

    // ================= VALIDATION =================
  const allowedPlacements = [
  // =========================
  // HOMEPAGE
  // =========================
  "homepage_top",
  "homepage_middle",
  "homepage_bottom",

  // =========================
  // CITY PAGE
  // =========================
  "city_page_top",
  "city_page_middle",
  "city_page_bottom",

  // =========================
  // CATEGORY PAGE
  // =========================
  "category_page_top",
  "category_page_middle",
  "category_page_bottom",

  // =========================
  // BUSINESS LISTING SECTIONS
  // =========================
  "featured_business_top",
  "featured_business_bottom",

  "top_rated_business_top",
  "top_rated_business_bottom",

  "latest_business_top",
  "latest_business_bottom",

  // =========================
  // SEARCH RESULTS
  // =========================
  "search_results_top",
  "search_results_bottom",

  // =========================
  // BUSINESS DETAIL PAGE
  // =========================
  "business_detail_middle",
  "business_detail_bottom",
];

    if (placement && !allowedPlacements.includes(placement)) {
      return res.status(400).json({
        success: false,
        message: "Invalid placement",
      });
    }

    if (
      (cityId && !mongoose.Types.ObjectId.isValid(cityId)) ||
      (categoryId && !mongoose.Types.ObjectId.isValid(categoryId))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid cityId or categoryId",
      });
    }

    if (
  businessId &&
  !mongoose.Types.ObjectId.isValid(businessId)
) {
  return res.status(400).json({
    success: false,
    message: "Invalid businessId",
  });
}

// ================= BUSINESS EXISTENCE VALIDATION =================

if (businessId) {
  const businessExists = await Business.exists({
    _id: businessId,
  });

  if (!businessExists) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }
}

if (businessId) {
  const business =
    await Business.findById(businessId)
      .select("_id owner");

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  // Provider can target ONLY their own business.
  if (
    role === "provider" &&
    (
      !business.owner ||
      business.owner.toString() !==
        req.user._id.toString()
    )
  ) {
    return res.status(403).json({
      success: false,
      message:
        "Providers can target only their own businesses",
    });
  }
}

// =========================
// DURATION + SERVER-SIDE PRICING
// =========================
// User/provider banners use server-side pricing.
// Admin/superadmin banners remain internal.
// Never trust price, basePrice, or discountPercent
// from frontend.

const finalDurationMonths = isAdmin
  ? 1
  : (
      durationMonths !== undefined
        ? Number(durationMonths)
        : Number(banner.durationMonths) || 1
    );

// Customer banners must use supported durations.
if (
  !isAdmin &&
  ![1, 3, 6, 12].includes(finalDurationMonths)
) {
  return res.status(400).json({
    success: false,
    message:
      "Invalid banner duration. Allowed durations are 1, 3, 6, and 12 months",
  });
}

// =========================
// SERVER-SIDE PRICING
// =========================

const finalBasePrice =
  isAdmin
    ? 0
    : BANNER_PRICES[finalPlacement];

if (
  !isAdmin &&
  (!Number.isFinite(finalBasePrice) ||
    finalBasePrice <= 0)
) {
  return res.status(400).json({
    success: false,
    message:
      "Banner price is not configured for this placement",
  });
}

// =========================
// DISCOUNT
// =========================

const discountPercentMap = {
  1: 0,
  3: 5,
  6: 10,
  12: 15,
};

const finalDiscountPercent =
  isAdmin
    ? 0
    : discountPercentMap[finalDurationMonths];

const originalAmount =
  finalBasePrice * finalDurationMonths;

const discountAmount =
  originalAmount *
  (finalDiscountPercent / 100);

const finalBannerPrice =
  isAdmin
    ? 0
    : Math.round(
        originalAmount - discountAmount
      );

    // ================= UPDATE FIELDS =================
banner.title =
  title !== undefined
    ? title.trim()
    : banner.title;

banner.image =
  image !== undefined
    ? image.trim()
    : banner.image;

banner.link =
  link !== undefined
    ? (link.trim() || undefined)
    : banner.link;

banner.placement =
  placement ?? banner.placement;

if (isAdmin) {
  banner.cityId =
    cityId !== undefined
      ? cityId
      : banner.cityId;

  banner.categoryId =
    categoryId !== undefined
      ? categoryId
      : banner.categoryId;

  banner.businessId =
  businessId !== undefined
    ? businessId
    : banner.businessId;

  // =========================
// UPDATE DURATION + PRICING
// =========================

banner.durationMonths =
  finalDurationMonths;

banner.basePrice =
  isAdmin
    ? 0
    : finalBasePrice;

banner.discountPercent =
  isAdmin
    ? 0
    : finalDiscountPercent;

banner.price =
  isAdmin
    ? 0
    : finalBannerPrice;
} else {

banner.cityId =
  finalCityId || null;

banner.categoryId =
  finalCategoryId || null;

banner.businessId =
  finalBusinessId || null;
}

banner.isActive =
  isActive ?? banner.isActive;

    await banner.save();

    return res.json({
      success: true,
      data: banner,
      meta: {
        message: "Banner updated successfully",
      },
    });

  } catch (error) {
    console.error("Update Banner Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update banner",
    });
  }
};