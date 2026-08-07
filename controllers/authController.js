import dotenv from "dotenv";

dotenv.config();

import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

import User from "../models/User.js";
import OtpVerification from "../models/OtpVerification.js";


// ================= GENERATE TOKEN =================

const generateToken = (id) => {

  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    {
      expiresIn:"30d"
    }
  );

};

const generateResetToken = (email)=>{

return jwt.sign(
{
email,
type:"password_reset"
},
process.env.JWT_SECRET,
{
expiresIn:"10m"
}
);

};

// ================= EMAIL TRANSPORTER =================

const transporter = nodemailer.createTransport({

  service:"gmail",

  auth:{
    user:process.env.EMAIL_USER,
    pass:process.env.EMAIL_PASS
  }

});

// ================= GENERATE OTP =================

const generateOTP = () => {

 return Math.floor(
   100000 + Math.random()*900000
 ).toString();

};



// ================= SEND EMAIL OTP =================

  const sendEmailOTP = async(
  email,
  otp,
  subject
  )=>{


  await transporter.sendMail({

  from:process.env.EMAIL_USER,

  to:email,

  subject,

  text:
  `
  Your ServDial OTP is ${otp}

  OTP valid for 5 minutes.
  `

  });


  };


// =================================================
// SEND REGISTRATION OTP
// =================================================

export const sendRegistrationOTP =
asyncHandler(async(req,res)=>{


let {email}=req.body;


if(!email){

 res.status(400);

 throw new Error(
 "Email is required"
 );

}


email=email.trim().toLowerCase();



const existingUser =
await User.findOne({email});


if(existingUser){

 res.status(400);

 throw new Error(
 "Email already registered"
 );

}



const otp = generateOTP();



await OtpVerification.deleteMany({

 email,

 type:"email_verification"

});



await OtpVerification.create({

 email,

 otp,

 type:"email_verification",

 expiresAt:
 Date.now()+5*60*1000

});



await sendEmailOTP(
 email,
 otp,
 "ServDial Email Verification OTP"
);



res.json({

 success:true,

 message:"OTP sent successfully"

});


});


// =================================================
// VERIFY OTP
// =================================================

export const verifyOTP =
asyncHandler(async(req,res)=>{


let {
email,
otp,
type
}=req.body;


email=email.trim().toLowerCase();



const record =
await OtpVerification.findOne({

email,

otp,

type,

expiresAt:{
$gt:Date.now()
}

});



if(!record){

res.status(400);

throw new Error(
"Invalid OTP"
);

}



await OtpVerification.deleteOne({
_id:record._id
});



res.json({

success:true,

message:"OTP verified"

});


});

// =================================================
// REGISTER USER / PROVIDER
// =================================================

export const registerUser =
asyncHandler(async(req,res)=>{


let {

name,
email,
phone,
password,
role="user",

businessName,
categoryId,
cityId,

emailOtp

}=req.body;



// Required validation

if(
!name ||
!email ||
!phone ||
!password ||
!emailOtp
){

res.status(400);

throw new Error(
"Please provide all required fields"
);

}



// Provider validation

if(
role==="provider" &&
(
!businessName ||
!categoryId ||
!cityId
)
){

res.status(400);

throw new Error(
"Provider details required"
);

}



// Normalize data

email =
email
.trim()
.toLowerCase();


phone =
phone
.trim()
.replace(/\D/g,"")
.slice(-10);



// Check duplicate user

const existingUser =
await User.findOne({

$or:[

{
email
},

{
phone
}

]

});


if(existingUser){

res.status(400);

throw new Error(
"Email or phone already registered"
);

}



// Verify Email OTP

const otpRecord =
await OtpVerification.findOne({

email,

otp:emailOtp,

type:"email_verification",

expiresAt:{
$gt:Date.now()
}

});

await OtpVerification.deleteOne({
_id:otp._id
});



if(!otpRecord){

res.status(400);

throw new Error(
"Invalid or expired email OTP"
);

}




// Create User

const user =
await User.create({

name:
name.trim(),

email,

phone,

password,

role,


companyName:
role==="provider"
?
businessName.trim()
:
undefined,


categoryId:
role==="provider"
?
categoryId
:
undefined,


cityId:
role==="provider"
?
cityId
:
undefined,


isEmailVerified:true,

isPhoneVerified:false,

isVerified:true


});



// Remove used OTP

await OtpVerification.deleteOne({

_id:otpRecord._id

});



// Response

res.status(201).json({

success:true,

message:
"Registration successful",


user:{

_id:user._id,

name:user.name,

email:user.email,

phone:user.phone,

role:user.role

},


token:
generateToken(user._id)

});


});

// =================================================
// LOGIN
// =================================================

export const loginUser =
asyncHandler(async(req,res)=>{


let {
emailOrPhone,
password
}=req.body;



if(!emailOrPhone || !password){

res.status(400);

throw new Error(
"Login details required"
);

}



if(emailOrPhone.includes("@")){

emailOrPhone=
emailOrPhone.toLowerCase();

}
else{

emailOrPhone=
emailOrPhone.replace(/\D/g,"").slice(-10);

}



const user =
await User.findOne({

$or:[

{
email:emailOrPhone
},

{
phone:emailOrPhone
}

]

})
.select("+password");



if(!user){

res.status(401);

throw new Error(
"User not found"
);

}



const match =
await bcrypt.compare(
password,
user.password
);



if(!match){

res.status(401);

throw new Error(
"Wrong password"
);

}



res.json({

success:true,

user:{
_id:user._id,
name:user.name,
email:user.email,
phone:user.phone,
role:user.role
},

token:
generateToken(user._id)

});


});


// =================================================
// SEND FORGOT PASSWORD OTP
// =================================================

export const sendForgotPasswordOTP =
asyncHandler(async(req,res)=>{


let {
email
}=req.body;



if(!email){

res.status(400);

throw new Error(
"Email is required"
);

}



email =
email
.trim()
.toLowerCase();



// Check user exists

const user =
await User.findOne({
email
});



// Security: don't reveal email exists

if(!user){

return res.json({

success:true,

message:
"OTP sent successfully"

});

}



// Generate OTP

const otp =
generateOTP();



// Remove old reset OTP

await OtpVerification.deleteMany({

email,

type:"password_reset"

});



// Save new OTP

await OtpVerification.create({

email,

otp,

type:"password_reset",

expiresAt:
Date.now()+5*60*1000

});



// Send Email

await sendEmailOTP(

email,

otp,

"ServDial Password Reset OTP"

);



res.json({

success:true,

message:
"OTP sent successfully"

});


});


// =================================================
// VERIFY FORGOT PASSWORD OTP
// =================================================

export const verifyForgotPasswordOTP =
asyncHandler(async(req,res)=>{


let {

email,

otp

}=req.body;



if(
!email ||
!otp
){

res.status(400);

throw new Error(
"Email and OTP required"
);

}



email =
email
.trim()
.toLowerCase();



// Find OTP

const otpRecord =
await OtpVerification.findOne({

email,

otp,

type:"password_reset",

expiresAt:{
$gt:Date.now()
}

});



if(!otpRecord){

res.status(400);

throw new Error(
"Invalid or expired OTP"
);

}



// Generate temporary reset token

const resetToken =
generateResetToken(email);



// Remove OTP after verification

await OtpVerification.deleteOne({

_id:otpRecord._id

});



res.json({

success:true,

message:
"OTP verified successfully",


resetToken

});


});


// =================================================
// RESET PASSWORD
// =================================================

export const resetPassword =
asyncHandler(async(req,res)=>{


const {

resetToken,

password,

confirmPassword

}=req.body;



if(
!resetToken ||
!password ||
!confirmPassword
){

res.status(400);

throw new Error(
"All fields are required"
);

}



// Password match check

if(password !== confirmPassword){

res.status(400);

throw new Error(
"Passwords do not match"
);

}



// Verify reset token

let decoded;


try{

decoded =
jwt.verify(
resetToken,
process.env.JWT_SECRET
);


}
catch(error){

res.status(400);

throw new Error(
"Invalid or expired reset token"
);

}



// Check token type

if(
decoded.type !== "password_reset"
){

res.status(400);

throw new Error(
"Invalid reset token"
);

}



const email =
decoded.email;



// Find user

const user =
await User.findOne({
email
});



if(!user){

res.status(404);

throw new Error(
"User not found"
);

}



// Update password

user.password =
password;



await user.save();



// Remove any old reset OTP

await OtpVerification.deleteMany({

email,

type:"password_reset"

});



res.json({

success:true,

message:
"Password updated successfully"

});


});


// =================================================
// PROFILE
// =================================================

export const getUserProfile =
asyncHandler(async(req,res)=>{


const user =
await User.findById(
req.user._id
)
.select("-password");



if(!user){

res.status(404);

throw new Error(
"User not found"
);

}



res.json({

success:true,

user

});


});