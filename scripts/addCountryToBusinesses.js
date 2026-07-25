import mongoose from "mongoose";
import Business from "../models/Business.js";
import dotenv from "dotenv";

dotenv.config();


await mongoose.connect(
  process.env.MONGO_URI
);


await Business.updateMany(
  {
    country:{
      $exists:false
    }
  },
  {
    $set:{
      country:"India"
    }
  }
);


console.log(
  "Country added successfully"
);


process.exit();