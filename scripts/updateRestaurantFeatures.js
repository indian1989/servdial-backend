import mongoose from "mongoose";
import Category from "../models/Category.js";
import dotenv from "dotenv";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

await Category.updateOne(
  {
    slug: "restaurants"
  },
  {
    $set: {
      uiType: "restaurant",
      features: [
        "table_booking",
        "food_menu",
        "party_booking"
      ]
    }
  }
);

console.log("Restaurant features updated");

await mongoose.disconnect();
process.exit();