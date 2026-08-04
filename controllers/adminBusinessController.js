import asyncHandler from "express-async-handler";
import Business from "../models/Business.js";
import { pingSearchEngines } from "../services/seo/pingSearchEngines.js";

/* ======================================================
   GET ALL BUSINESSES (ADMIN)
====================================================== */
export const getAllBusinessesAdmin = asyncHandler(async (req, res) => {
  const businesses = await Business.find()
    .setOptions({ includeAll: true })
    .populate("cityId", "name slug")
    .populate("categoryId", "name slug")
    .populate("owner", "name email role")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: businesses,
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