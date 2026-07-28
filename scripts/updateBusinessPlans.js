import mongoose from "mongoose";
import dotenv from "dotenv";
import Business from "../models/Business.js";

dotenv.config();

const updatePlans = async () => {
  try {

    await mongoose.connect(process.env.MONGO_URI);

    const result = await Business.updateMany(
      {
        plan: { $exists: false }
      },
      {
        $set: {
          plan: "free"
        }
      }
    );

    console.log("Updated:", result.modifiedCount);

    process.exit();

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

updatePlans();