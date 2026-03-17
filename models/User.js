// backend/models/User.js

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    minlength: 2,
    maxlength: 50
  },

  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },

  phone: {
    type: String,
    unique: true,
    sparse: true
  },

  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: 6,
    select: false
  },

  role: {
    type: String,
    enum: ["user","provider","admin","superadmin"],
    default: "user",
    index: true
  },

  // account status
  isVerified: {
    type: Boolean,
    default: false
  },

  isActive: {
    type: Boolean,
    default: true
  },

  lastLogin: {
    type: Date
  },

  // provider profile
  companyName: {
    type: String
  },

  profileImage: {
    type: String
  },

  address: {
    type: String
  },

  city: {
    type: String,
    index: true
  },

  // password reset
  resetPasswordToken: {
    type: String
  },

  resetPasswordExpire: {
    type: Date
  }

},
{
  timestamps: true
});


// ================= PASSWORD HASH =================

userSchema.pre("save", async function(next){

  if(!this.isModified("password")) return next()

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)

  next()

})


// ================= PASSWORD COMPARE =================

userSchema.methods.matchPassword = async function(enteredPassword){

  return await bcrypt.compare(enteredPassword, this.password)

}


export default mongoose.model("User", userSchema);