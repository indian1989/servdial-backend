import mongoose from "mongoose";
import Banner from "../models/Banner.js";

/* =========================
   CREATE BANNER
========================= */
export const createBanner = async (req, res) => {
  try {
    const { title, image, link, placement, cityId, categoryId } = req.body;

    const role = req.user.role;
    const isAdmin = role === "admin" || role === "superadmin";
    const isProvider = role === "provider";

    // ================= ROLE CHECK =================
    if (!["admin", "superadmin", "provider"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to create banners",
      });
    }

    if (role === "user") {
      return res.status(403).json({
        success: false,
        message: "Users are not allowed",
      });
    }

    // ================= PLACEMENT VALIDATION =================
    const allowedPlacements = [
      "homepage_top",
      "homepage_middle",
      "homepage_bottom",
      "category_page",
      "city_page",
    ];

    if (!allowedPlacements.includes(placement)) {
      return res.status(400).json({
        success: false,
        message: "Invalid placement",
      });
    }

    // ================= PROVIDER RULE =================
    // provider MUST have city/category
    if (isProvider && (!cityId || !categoryId)) {
      return res.status(400).json({
        success: false,
        message: "cityId and categoryId required for provider",
      });
    }

    // ================= ADMIN RULE =================
    // admin/superadmin → GLOBAL banner allowed (NULL city/category)
    let finalCityId = null;
    let finalCategoryId = null;

    if (isProvider) {
      finalCityId = cityId;
      finalCategoryId = categoryId;

      if (
        !mongoose.Types.ObjectId.isValid(cityId) ||
        !mongoose.Types.ObjectId.isValid(categoryId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid cityId or categoryId",
        });
      }
    }

    // ================= DUPLICATE CHECK =================
    const existingPending = await Banner.findOne({
      createdBy: req.user._id,
      status: "pending",
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending banner",
      });
    }

    // ================= CREATE =================
    const banner = await Banner.create({
      title,
      image,
      link,
      placement,

      cityId: finalCityId,       // 🔥 IMPORTANT FIX
      categoryId: finalCategoryId, // 🔥 IMPORTANT FIX

      createdBy: req.user._id,
      role,

      status: isAdmin ? "approved" : "pending",
      paymentStatus: isAdmin ? "paid" : "pending",

      approvedBy: isAdmin ? req.user._id : undefined,
      approvedAt: isAdmin ? new Date() : undefined,
    });

    return res.status(201).json({
      success: true,
      data: banner,
      meta: {
        status: isAdmin ? "auto-approved" : "pending",
        scope: isAdmin ? "GLOBAL" : "TARGETED",
      },
    });
  } catch (error) {
    console.error("Create Banner Error:", error);
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
    const banner = await Banner.findByIdAndUpdate(
      req.params.bannerId,
      {
        status: "approved",
        approvedBy: req.user._id,
        approvedAt: new Date(),
      },
      { new: true }
    );

    // ✅ NULL CHECK (after DB call)
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    // ✅ STANDARD RESPONSE
    res.json({
      success: true,
      data: banner,
      meta: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to approve banner",
    });
  }
};

export const rejectBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndUpdate(
      req.params.bannerId,
      { status: "rejected" },
      { new: true }
    );

    if (!banner) {
  return res.status(404).json({
    success: false,
    message: "Banner not found",
  });
}

    res.json({
  success: true,
  data: banner,
  meta: {}
});
  } catch (error) {
    res.status(500).json({
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
    console.log("🔥 getBanners HIT");
    const now = new Date();

    const { cityId, categoryId, placement } = req.query;
console.log("📩 QUERY RECEIVED:", { cityId, categoryId, placement });

    // ================= BASE FILTER =================
    const filter = {
  status: "approved",
  isActive: true,
  paymentStatus: { $in: ["paid", "pending"] },
  $and: [
    {
      $or: [
        { startDate: { $lte: now } },
        { startDate: null },
        { startDate: { $exists: false } },
      ],
    },
    {
      $or: [
        { endDate: { $gte: now } },
        { endDate: null },
        { endDate: { $exists: false } },
      ],
    },
  ],
};

    // ================= GLOBAL + LOCAL LOGIC =================

    // CITY FILTER (GLOBAL + MATCHING CITY)
    if (cityId) {
      filter.$and.push({
        $or: [
          { cityId: cityId },
          { cityId: null },
          { cityId: { $exists: false } },
        ],
      });
    }

    // CATEGORY FILTER (GLOBAL + MATCHING CATEGORY)
    if (categoryId) {
      filter.$and.push({
        $or: [
          { categoryId: categoryId },
          { categoryId: null },
          { categoryId: { $exists: false } },
        ],
      });
    }

    // ================= PLACEMENT FILTER =================
    if (placement) {
      filter.placement = placement;
    }

    // ================= QUERY =================
    const banners = await Banner.find(filter)
    console.log("📦 RAW BANNERS COUNT:", banners.length);
console.log("📦 SAMPLE BANNER:", banners[0])
      .sort({ order: 1, createdAt: -1 })
      .lean()
      .select("title image link placement cityId categoryId order");
console.log("🚀 SENDING RESPONSE WITH:", banners.length);

    // ================= RESPONSE =================
    res.json({
      success: true,
      data: banners,
      meta: {
        total: banners.length,
        filters: {
          cityId: cityId || null,
          categoryId: categoryId || null,
          placement: placement || null,
        },
      },
    });
  } catch (error) {
    console.error("Get Banners Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch banners",
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
const all = await Banner.find().lean();
console.log("ALL BANNERS COUNT:", all.length);
console.log("SAMPLE BANNER:", all[0]);

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
   MARK BANNER PAID (Admin and Superadmin Only)
========================= */
export const markBannerPaid = async (req, res) => {
  try {
    const { paymentId } = req.body;

    const banner = await Banner.findByIdAndUpdate(
      req.params.bannerId,
      {
        paymentStatus: "paid",
        paymentId,
      },
      { new: true }
    );

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    res.json({
      success: true,
      data: banner,
      meta: {},
    });
  } catch (error) {
    res.status(500).json({
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
    const { title, image, link, placement, cityId, categoryId, isActive } = req.body;

    const role = req.user.role;
    const isAdmin = role === "admin" || role === "superadmin";
    const isProvider = role === "provider";

    const banner = await Banner.findById(req.params.bannerId);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    // ================= ROLE PROTECTION =================
    if (!["admin", "superadmin", "provider"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to update banner",
      });
    }

    if (role === "user") {
      return res.status(403).json({
        success: false,
        message: "Users are not allowed to update banners",
      });
    }

    // ================= PROTECTED BANNER RULE =================
    if (
      banner.status === "approved" &&
      banner.paymentStatus === "paid" &&
      role === "provider"
    ) {
      return res.status(403).json({
        success: false,
        message: "Cannot modify approved paid banner",
      });
    }

    // ================= PROVIDER VALIDATION =================
    if (isProvider && (!cityId || !categoryId)) {
      return res.status(400).json({
        success: false,
        message: "cityId and categoryId are required for providers",
      });
    }

    // ================= VALIDATION =================
    const allowedPlacements = [
      "homepage_top",
      "homepage_middle",
      "homepage_bottom",
      "category_page",
      "city_page",
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

    // ================= UPDATE FIELDS =================
    banner.title = title ?? banner.title;
    banner.image = image ?? banner.image;
    banner.link = link ?? banner.link;
    banner.placement = placement ?? banner.placement;
    banner.cityId = cityId ?? banner.cityId;
    banner.categoryId = categoryId ?? banner.categoryId;
    banner.isActive = isActive ?? banner.isActive;

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