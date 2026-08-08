// backend/controllers/userController.js
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Business from "../models/Business.js"; // assuming you have a Business model
import bcrypt from "bcryptjs";

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