import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import Business from "../models/Business.js";
import { pingSearchEngines } from "../services/seo/pingSearchEngines.js";
import City from "../models/City.js";
import Category from "../models/Category.js";

/* ======================================================
   GET ALL BUSINESSES (ADMIN)
   - Lightweight list data only
   - Full business document is loaded on Edit
====================================================== */
export const getAllBusinessesAdmin = asyncHandler(async (req, res) => {
  const businesses = await Business.find()
    .setOptions({ includeAll: true })
    .select(
      "_id name images address cityId categoryId claimStatus isClaimed status isFeatured isVerified plan createdAt"
    )
    .populate("cityId", "name slug")
    .populate("categoryId", "name slug")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: businesses,
  });
});

/* ======================================================
   GET SINGLE BUSINESS (ADMIN EDIT)
   - Full business document
   - Used only when admin opens Edit
====================================================== */
export const getBusinessByIdAdmin = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id)
    .setOptions({ includeAll: true })
    .populate("cityId")
    .populate("categoryId")
    .populate("owner", "name email role");

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  res.json({
    success: true,
    data: business,
  });
});

/* ======================================================
   APPROVE BUSINESS
   - SEO ping only on first approval
====================================================== */
export const approveBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  // already approved
  if (business.status === "approved") {
    return res.json({
      success: true,
      message: "Business already approved",
      data: business,
    });
  }

business.status = "approved";

business.updatedAt = new Date();

await business.save();

  // SEO ping (non-blocking safe)
  try {
    if (business.slug) {
      await pingSearchEngines();
      console.log(
        `✅ SEO ping triggered for business: ${business.slug}`
      );
    }
  } catch (err) {
    console.error(
      "⚠️ SEO ping failed:",
      err.message
    );
  }

  res.json({
    success: true,
    message: "Business approved",
    data: business,
  });
});

/* ======================================================
   REJECT BUSINESS
====================================================== */
export const rejectBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

 business.status = "rejected";

business.updatedAt = new Date();

  await business.save();

  res.json({
    success: true,
    message: "Business rejected",
    data: business,
  });
});

/* ======================================================
   DELETE BUSINESS
====================================================== */
export const deleteBusinessAdmin = asyncHandler(async (req, res) => {
  const business = await Business.findByIdAndDelete(
    req.params.id
  );

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  res.json({
    success: true,
    message: "Business deleted",
  });
});

/* ======================================================
   FEATURE TOGGLE
====================================================== */
export const toggleFeatured = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  business.isFeatured = !business.isFeatured;
  business.featurePriority = business.isFeatured ? 10 : 0;
  business.updatedAt = new Date();

  await business.save();

  res.json({
    success: true,
    data: business,
  });
});

/* ======================================================
   VERIFIED TOGGLE
====================================================== */
export const toggleVerifiedBusiness = asyncHandler(async (req, res) => {

  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }


  // Already verified
  if (business.isVerified) {
    return res.json({
      success: true,
      message: "Business is already verified",
      data: business,
    });
  }


  // Permanent verification
  business.isVerified = true;


  // Priority update

  if (business.plan === "premium") {

    business.priorityScore = 100;

  } 
  else if (business.plan === "trusted") {

    business.priorityScore = 50;

  }
  else {

    // Free verified business
    business.priorityScore = 20;

  }


  business.updatedAt = new Date();


  await business.save();


  res.json({
    success: true,
    message: "Business verified successfully",
    data: business,
  });

});

/* ======================================================
   BUSINESS STATS
====================================================== */
export const getBusinessStats = asyncHandler(async (req, res) => {
  const [
    total,
    approved,
    pending,
    rejected,
    featured,
  ] = await Promise.all([
    Business.countDocuments(),
    Business.countDocuments({ status: "approved" }),
    Business.countDocuments({ status: "pending" }),
    Business.countDocuments({ status: "rejected" }),
    Business.countDocuments({ isFeatured: true }),
  ]);

  res.json({
    success: true,
    data: {
      total,
      approved,
      pending,
      rejected,
      featured,
    },
  });
});

/* ======================================================
   APPROVE CLAIM
====================================================== */
export const approveClaim = asyncHandler(async(req,res)=>{

 const business = await Business.findById(req.params.id);

 if(!business){
  return res.status(404).json({
   success:false,
   message:"Business not found"
  });
 }


 if(business.claimStatus !== "pending"){
  return res.status(400).json({
   success:false,
   message:"No pending claim found"
  });
 }


 business.claimStatus = "approved";

business.isClaimed = true;


if(business.claimedBy){

  business.owner = business.claimedBy;

}


business.claimedAt = new Date();

business.updatedAt = new Date();


await business.save();

 res.json({
  success:true,
  message:"Claim approved",
  data:business
 });

});

/* ======================================================
   REJECT CLAIM
====================================================== */
export const rejectClaim = asyncHandler(async(req,res)=>{

 const business = await Business.findById(req.params.id);


 if(!business){
   return res.status(404).json({
    success:false,
    message:"Business not found"
   });
 }


 business.claimStatus="rejected";
 business.updatedAt=new Date();


 await business.save();


 res.json({
  success:true,
  message:"Claim rejected",
  data:business
 });

});

/* ======================================================
   UPDATE BUSINESS PLAN
====================================================== */

export const updateBusinessPlan = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);
  
  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }
  
  const { plan } = req.body;
  
  if (!["free", "trusted", "premium"].includes(plan)) {
    return res.status(400).json({
      success: false, message: "Invalid plan",
    });
  }
  
  /* ========= UPDATE PLAN =========== */
  
  business.plan = plan;
  
  /* ============ TRUST / PREMIUM FLAGS =========== */
  business.isTrustedPartner =
  plan === "trusted" || plan === "premium";
  
  business.isPremiumPartner =
  plan === "premium";
  
  /* ==========
  VERIFIED RULE
  Trusted / Premium => auto verify
  Free => preserve existing verification
  Once verified, never remove verification.
  =========== */
  
  if (plan === "trusted" || plan === "premium") {
    business.isVerified = true;
  }
  
  /* =============
  FEATURED RULE
  Premium => featured
  Others => not featured
  ==================== */
  
  business.isFeatured = plan === "premium";
  
  /* ================
  PRIORITY SCORE
  =================== */
  
  if (plan === "premium") {
    business.priorityScore = 100;

  } else if (plan === "trusted") {
    business.priorityScore = 50;
  
  } else if (business.isVerified) {
    business.priorityScore = 20;
  
  } else { business.priorityScore = 10;

  }
  
  business.updatedAt = new Date();
  
  await business.save();
  
  res.json({
    success: true,
    message: "Business plan updated",
    data: business,
  });
});

/* ======================================================
   EXPORT BUSINESSES CSV
   - City / District / State / All
   - Exports all matching non-deleted businesses
   - Uses database cursor for large datasets
====================================================== */

const escapeCsv = (value) => {
  if (value === null || value === undefined) return "";

  let text;

  if (value instanceof Date) {
    text = value.toISOString();
  } else if (Array.isArray(value)) {
    text = value
      .map((item) =>
        typeof item === "object"
          ? JSON.stringify(item)
          : String(item ?? "")
      )
      .join(" | ");
  } else if (typeof value === "object") {
    text = JSON.stringify(value);
  } else {
    text = String(value);
  }

  // Prevent CSV formula injection in spreadsheet applications
  if (/^[\s]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
};

const csvColumns = [
  ["Business Name", (b) => b.name],
  ["Slug", (b) => b.slug],
  ["Description", (b) => b.description],

  ["Parent Category", (b) => b.parentCategoryId?.name],
  ["Category", (b) => b.categoryId?.name],
  [
    "Secondary Categories",
    (b) => b.secondaryCategoryIds?.map((c) => c.name),
  ],

  ["Services", (b) => b.services],
  ["Service Types", (b) => b.serviceTypes],
  ["Service Coverage", (b) => b.serviceCoverage],

  ["Street", (b) => b.address?.street],
  ["Area", (b) => b.address?.area],
  ["Landmark", (b) => b.address?.landmark],

  ["City", (b) => b.cityId?.name || b.cityName],
  ["District", (b) => b.district],
  ["State", (b) => b.state],
  ["Country", (b) => b.country],
  ["Pincode", (b) => b.pincode],

  [
    "Google Map Coordinates",
    (b) => b.location?.coordinates?.length === 2
      ? `${b.location.coordinates[1]},${b.location.coordinates[0]}`
      : "",
  ],

  ["Mobile", (b) => b.phone],
  ["Mobile Country Code", (b) => b.phoneCountryCode],
  ["WhatsApp", (b) => b.whatsapp],
  ["WhatsApp Country Code", (b) => b.whatsappCountryCode],
  ["Alternate Mobile", (b) => b.alternatePhone],
  ["Landline", (b) => b.landline],
  ["Landline Country Code", (b) => b.landlineCountryCode],
  ["Phone Verified", (b) => b.phoneVerified],
  ["Document Verified", (b) => b.documentVerified],

  ["Email", (b) => b.email],
  ["Website", (b) => b.website],

  ["Food Type", (b) => b.foodType],
  ["Menu", (b) => b.menu],
  ["Pricing", (b) => b.pricing],
  ["Payment Options", (b) => b.paymentOptions],
  ["Business Features", (b) => b.businessFeatures],

  ...[
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ].flatMap((day) => [
    [`${day} Open`, (b) => b.businessHours?.[day]?.open],
    [`${day} Close`, (b) => b.businessHours?.[day]?.close],
    [`${day} Closed`, (b) => b.businessHours?.[day]?.closed],
  ]),

  ["Average Rating", (b) => b.averageRating],
  ["Total Reviews", (b) => b.totalReviews],

  ["Status", (b) => b.status],
  ["Claim Status", (b) => b.claimStatus],
  ["Is Claimed", (b) => b.isClaimed],

  ["Verification Status", (b) => b.verificationStatus],
  ["Verification Type", (b) => b.verificationType],
  ["Is Verified", (b) => b.isVerified],

  ["Plan", (b) => b.plan],
  ["Is Featured", (b) => b.isFeatured],
  ["Feature Priority", (b) => b.featurePriority],

  ["Created At", (b) => b.createdAt],
  ["Updated At", (b) => b.updatedAt],
];

export const exportBusinessesCsv = asyncHandler(async (req, res) => {
  const { scope, cityId, district, state, category } = req.query;

  const filter = {};

  if (scope === "city") {
    if (!mongoose.isValidObjectId(cityId)) {
      return res.status(400).json({
        success: false,
        message: "Valid cityId is required",
      });
    }

    filter.cityId = cityId;
  } else if (scope === "district") {
    if (!district || !state) {
      return res.status(400).json({
        success: false,
        message: "District and state are required",
      });
    }

    const cities = await City.find({
      district: district.trim(),
      state: state.trim(),
    }).select("_id").lean();

    const cityIds = cities.map((city) => city._id);

    filter.cityId = { $in: cityIds };
  } else if (scope === "state") {
    if (!state) {
      return res.status(400).json({
        success: false,
        message: "State is required",
      });
    }

    const cities = await City.find({
      state: state.trim(),
    }).select("_id").lean();

    const cityIds = cities.map((city) => city._id);

    filter.cityId = { $in: cityIds };
  } else if (scope !== "all") {
    return res.status(400).json({
      success: false,
      message: "Invalid export scope",
    });
  }

    // Category filter
  if (category && category.trim()) {
    const categories = await Category.find({
      name: category.trim(),
    })
      .select("_id")
      .lean();

    const categoryIds = categories.map((item) => item._id);

    filter.categoryId = {
      $in: categoryIds,
    };
  }

  const filename = `ServDial-Businesses-${scope}-${Date.now()}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );

  // UTF-8 BOM for Excel compatibility
  res.write("\uFEFF");

  res.write(
    csvColumns.map(([header]) => escapeCsv(header)).join(",") + "\r\n"
  );

  const cursor = Business.find(filter)
    .populate("cityId", "name")
    .populate("categoryId", "name")
    .populate("parentCategoryId", "name")
    .populate("secondaryCategoryIds", "name")
    .sort({ _id: 1 })
    .lean()
    .cursor();

  try {
    for await (const business of cursor) {
      if (res.destroyed) break;

      const row = csvColumns
        .map(([, getter]) => escapeCsv(getter(business)))
        .join(",");

      if (!res.write(row + "\r\n")) {
        await new Promise((resolve) => res.once("drain", resolve));
      }
    }

    if (!res.destroyed) {
      res.end();
    }
  } catch (error) {
    cursor.close();
    throw error;
  }
});