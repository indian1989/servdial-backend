// backend/controllers/userController.js
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Business from "../models/Business.js"; // assuming you have a Business model
import Banner from "../models/Banner.js";
import bcrypt from "bcryptjs";
import Review from "../models/Review.js";
import Notification from "../models/Notification.js";
import Message from "../models/Message.js";

// GET all businesses
export const getBusinesses = asyncHandler(async (req, res) => {
  const businesses = await Business.find({});
  res.json(businesses);
});

// UPDATE business status (approve/reject)
export const updateBusinessStatus = asyncHandler(async (req, res) => {
  const { businessId } = req.params;
  const { status } = req.body;

  const business = await Business.findById(businessId);
  if (!business) {
    res.status(404);
    throw new Error("Business not found");
  }

  business.status = status;
  await business.save();
  res.json({ message: `Business ${status} successfully`, business });
});

// TOGGLE paid services
export const togglePaidService = asyncHandler(async (req, res) => {
  const { businessId } = req.params;
  const { service } = req.body;

  const business = await Business.findById(businessId);
  if (!business) {
    res.status(404);
    throw new Error("Business not found");
  }

  // Toggle boolean value
  business.paidServices = business.paidServices || {};
  business.paidServices[service] = !business.paidServices[service];

  await business.save();
  res.json({ message: `${service} toggled`, business });
});

// CREATE admin (superadmin only)
export const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(400);
    throw new Error("Admin with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const admin = await User.create({ name, email, password: hashedPassword, role: "admin" });

  res.status(201).json({ admin });
});

// CHANGE password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    res.status(400);
    throw new Error("Current password is incorrect");
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ message: "Password updated successfully" });
});


// ================= SAVE BUSINESS =================

export const saveBusiness = asyncHandler(async(req,res)=>{

const userId = req.user._id;
const { businessId } = req.body;


if(!businessId){
  res.status(400);
  throw new Error("Business ID required");
}


const user = await User.findById(userId);


if(!user){
  res.status(404);
  throw new Error("User not found");
}


if(user.savedBusinesses.includes(businessId)){

return res.json({
 success:true,
 saved:true,
 message:"Already saved"
});

}


user.savedBusinesses.push(businessId);

await user.save();


res.json({
 success:true,
 saved:true,
 message:"Business saved"
});


});


// ================= CHECK SAVED BUSINESS =================

export const checkSavedBusiness = async(req,res)=>{

try{

const {businessId}=req.params;


const user = await User.findById(req.user._id);


const saved =
user.savedBusinesses.includes(businessId);


res.json({
success:true,
saved
});


}catch(error){

res.status(500).json({
success:false,
message:error.message
});

}

};


// ================= REMOVE SAVED =================

export const removeSavedBusiness = asyncHandler(async(req,res)=>{

const {businessId}=req.body;


await User.findByIdAndUpdate(
req.user._id,
{
 $pull:{
  savedBusinesses:businessId
 }
}
);


res.json({
 success:true,
 saved:false,
 message:"Removed from saved"
});


});

// ================= GET SAVED =================

export const getSavedBusinesses = asyncHandler(async(req,res)=>{


const user = await User.findById(req.user._id)
.populate({
 path:"savedBusinesses",
 populate:[
  {
   path:"categoryId"
  },
  {
   path:"cityId"
  }
 ]
});


res.json({

success:true,
data:user.savedBusinesses || []

});


});

// ================= USER BANNERS =================

// GET USER'S OWN BANNERS
export const getUserBanners = asyncHandler(async (req, res) => {
  const banners = await Banner.find({
    createdBy: req.user._id,
    role: "user",
  })
    .populate("cityId", "name slug")
    .populate("categoryId", "name slug")
    .populate("businessId", "name slug")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    count: banners.length,
    data: banners,
  });
});


// UPDATE USER'S OWN BANNER
export const updateUserBanner = asyncHandler(async (req, res) => {
  const { bannerId } = req.params;

  const banner = await Banner.findOne({
    _id: bannerId,
    createdBy: req.user._id,
    role: "user",
  });

  if (!banner) {
    res.status(404);
    throw new Error("Banner not found");
  }

  // User cannot modify approved + paid banner
  if (
    banner.status === "approved" &&
    banner.paymentStatus === "paid"
  ) {
    res.status(403);
    throw new Error(
      "Cannot modify approved paid banner"
    );
  }

  const {
    title,
    image,
    link,
    placement,
    cityId,
    categoryId,
    businessId,
    isActive,
  } = req.body;

  // Basic validation
  if (
    title !== undefined &&
    (!title || !title.trim())
  ) {
    res.status(400);
    throw new Error("Banner title cannot be empty");
  }

  if (
    image !== undefined &&
    (!image || !image.trim())
  ) {
    res.status(400);
    throw new Error("Banner image cannot be empty");
  }

  // User banners must remain targeted
  const finalCityId =
    cityId !== undefined
      ? cityId
      : banner.cityId;

  const finalCategoryId =
    categoryId !== undefined
      ? categoryId
      : banner.categoryId;

  if (!finalCityId || !finalCategoryId) {
    res.status(400);
    throw new Error(
      "cityId and categoryId are required for user banners"
    );
  }

  // Business detail placement requires business
  const finalPlacement =
    placement !== undefined
      ? placement
      : banner.placement;

  const businessDetailPlacements = [
    "business_detail_middle",
    "business_detail_bottom",
  ];

  const finalBusinessId =
    businessId !== undefined
      ? businessId
      : banner.businessId;

  if (
    businessDetailPlacements.includes(
      finalPlacement
    ) &&
    !finalBusinessId
  ) {
    res.status(400);
    throw new Error(
      "businessId is required for business detail banners"
    );
  }

  // Update fields
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

  if (isActive !== undefined) {
    banner.isActive = isActive;
  }

  await banner.save();

  const updatedBanner =
    await Banner.findById(banner._id)
      .populate("cityId", "name slug")
      .populate("categoryId", "name slug")
      .populate("businessId", "name slug")
      .lean();

  res.status(200).json({
    success: true,
    message: "Banner updated successfully",
    data: updatedBanner,
  });
});


// DELETE USER'S OWN BANNER
export const deleteUserBanner = asyncHandler(async (req, res) => {
  const { bannerId } = req.params;

  const banner = await Banner.findOne({
    _id: bannerId,
    createdBy: req.user._id,
    role: "user",
  });

  if (!banner) {
    res.status(404);
    throw new Error("Banner not found");
  }

  // Protect approved + paid banners
  if (
    banner.status === "approved" &&
    banner.paymentStatus === "paid"
  ) {
    res.status(403);
    throw new Error(
      "Cannot delete approved paid banner"
    );
  }

  await Banner.findByIdAndDelete(
    banner._id
  );

  res.status(200).json({
    success: true,
    data: null,
    meta: {
      message: "Banner deleted successfully",
    },
  });
});

 // ================= USER NOTIFICATIONS =================

export const getUserNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({
    user: req.user._id,
  })
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    count: notifications.length,
    notifications,
  });
});

// ================= USER MESSAGES =================

export const getUserMessages = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const messages = await Message.find({
    $or: [
      { sender: userId },
      { receiver: userId },
    ],
  })
    .populate("sender", "name email")
    .populate("receiver", "name email")
    .populate("business", "name slug")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    count: messages.length,
    messages,
  });
});