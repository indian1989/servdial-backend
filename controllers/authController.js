import dotenv from "dotenv";

dotenv.config();

import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import axios from "axios";

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



// ================= EMAIL TRANSPORTER =================

const transporter = nodemailer.createTransport({

  service:"gmail",

  auth:{
    user:process.env.EMAIL_USER,
    pass:process.env.EMAIL_PASS
  }

});

transporter.verify((error) => {

  if(error){

    console.log(
      "❌ SMTP ERROR:",
      error.message
    );

    console.log(
      "EMAIL_USER:",
      process.env.EMAIL_USER
    );

    console.log(
      "EMAIL_PASS LENGTH:",
      process.env.EMAIL_PASS?.length
    );

  }else{

    console.log(
      "✅ SMTP READY"
    );

  }

});



// ================= GENERATE OTP =================

const generateOTP = () => {

 return Math.floor(
   100000 + Math.random()*900000
 ).toString();

};



// ================= SEND EMAIL OTP =================

const sendEmailOTP = async(email,otp)=>{


 await transporter.sendMail({

  from:process.env.EMAIL_USER,

  to:email,

  subject:"ServDial Email Verification OTP",

  text:
  `
  Your ServDial verification OTP is ${otp}.

  This OTP is valid for 5 minutes.
  `

 });

};

// ================= SEND PHONE OTP =================

const sendPhoneOTP = async(phone, otp)=>{

  // SMS gateway integration later
  // Example: MSG91 / Twilio / Fast2SMS

  console.log(
    `Phone OTP for ${phone}: ${otp}`
  );

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
 otp
);



res.json({

 success:true,

 message:"OTP sent successfully"

});


});


// =================================================
// SEND PHONE OTP
// =================================================

export const sendPhoneVerificationOTP =
asyncHandler(async(req,res)=>{


let { phone } = req.body;


if(!phone){

res.status(400);

throw new Error(
"Phone number required"
);

}


phone = phone.trim();



const otp = generateOTP();



await OtpVerification.deleteMany({

email: phone,

type:"phone_verification"

});



await OtpVerification.create({

email: phone,

otp,

type:"phone_verification",

expiresAt:
Date.now()+5*60*1000

});



await sendPhoneOTP(
phone,
otp
);



res.json({

success:true,

message:"Phone OTP sent successfully"

});


});

// =================================================
// VERIFY OTP
// =================================================

export const verifyOTP =
asyncHandler(async(req,res)=>{


const {
email,
phone,
otp,
type
}=req.body;



const identifier =
email || phone;



if(!identifier || !otp || !type){

res.status(400);

throw new Error(
"OTP details required"
);

}



const otpRecord =
await OtpVerification.findOne({

email:identifier,

otp,

type,

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



res.json({

success:true,

message:"OTP verified successfully"

});


});

// =================================================
// REGISTER USER / PROVIDER
// =================================================

export const registerUser =
asyncHandler(async(req,res)=>{


let {

name,
businessName,
email,
phone,
password,
category,
city,
role="user",
emailOtp,
phoneOtp

}=req.body;



if(

!name ||

!email ||

!phone ||

!password ||

!emailOtp ||
!phoneOtp

){

res.status(400);

throw new Error(
"Please provide all required fields"
);


}





// Provider validation

if(

role==="provider"

&&

(!businessName || !category || !city)

){

res.status(400);

throw new Error(
"Provider details required"
);

}





email =
email.trim().toLowerCase();


// Check existing user

const userExists =
await User.findOne({

$or:[
 {email},
 {phone}
]

});

if(userExists){

res.status(400);

throw new Error(
"User with this email or phone already exists"
);

}

// Verify EMAIL OTP

const emailOtpRecord =
await OtpVerification.findOne({

email,

otp: emailOtp,

type:"email_verification",

expiresAt:{
 $gt:Date.now()
}

});


if(!emailOtpRecord){

res.status(400);

throw new Error(
"Invalid or expired email OTP"
);

}

// Verify PHONE OTP
const phoneOtpRecord =
await OtpVerification.findOne({

email: phone,

otp: phoneOtp,

type:"phone_verification",

expiresAt:{
 $gt:Date.now()
}

});


if(!phoneOtpRecord){

res.status(400);

throw new Error(
"Invalid or expired phone OTP"
);

}


// Create User

const user =
await User.create({

name:name.trim(),

email,

phone,

password:password.trim(),

role,


companyName:
role==="provider"
?
businessName
:
undefined,


city:
role==="provider"
?
city
:
undefined,

isEmailVerified:true,
isPhoneVerified:true,
isVerified:true


});




// save provider category later in provider profile
// currently User model doesn't contain category


// remove OTP

await OtpVerification.deleteMany({

$or:[

{
email,
type:"email_verification"
},

{
email:phone,
type:"phone_verification"
}

]

});

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



if(
!emailOrPhone ||
!password
){

res.status(400);

throw new Error(
"Please provide email/phone and password"
);

}



emailOrPhone =
emailOrPhone.trim().toLowerCase();



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




if(!user.isVerified){

res.status(401);

throw new Error(
"Please verify your email first"
);

}




const isMatch =
await bcrypt.compare(
password.trim(),
user.password
);



if(!isMatch){

res.status(401);

throw new Error(
"Invalid credentials"
);

}





user.lastLogin=new Date();

await user.save();





res.json({

success:true,

message:"Login successful",


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
// FORGOT PASSWORD
// =================================================

export const forgotPassword =
asyncHandler(async(req,res)=>{


let {email}=req.body;


if(!email){

res.status(400);

throw new Error(
"Email required"
);

}



email=email.trim().toLowerCase();



const user =
await User.findOne({email});



if(!user){

return res.json({

message:
"If email exists reset link sent"

});

}




const resetToken =
crypto.randomBytes(32).toString("hex");



user.resetPasswordToken =
resetToken;


user.resetPasswordExpire =
Date.now()+10*60*1000;



await user.save();





const resetUrl =
`${process.env.FRONTEND_URL}/reset-password/${resetToken}`;




await transporter.sendMail({

from:
process.env.EMAIL_USER,

to:user.email,

subject:
"ServDial Password Reset",

text:

`
Reset your password:

${resetUrl}

This link expires in 10 minutes.
`

});





res.json({

message:
"Reset link sent"

});



});








// =================================================
// RESET PASSWORD
// =================================================

export const resetPassword =
asyncHandler(async(req,res)=>{


const {token}=req.params;


const {password}=req.body;



const user =
await User.findOne({

resetPasswordToken:token,

resetPasswordExpire:{
$gt:Date.now()
}

});



if(!user){

res.status(400);

throw new Error(
"Invalid or expired token"
);

}



user.password=password;


user.resetPasswordToken=undefined;

user.resetPasswordExpire=undefined;



await user.save();



res.json({

message:
"Password reset successful"

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