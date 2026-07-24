import mongoose from "mongoose";
import dotenv from "dotenv";
import Category from "../models/Category.js";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const updates = [
  {
    filter: { name: { $regex: /^restaurants?$/i } },
    uiType: "restaurant",
  },
  {
    filter: { name: { $regex: /^hotels?$/i } },
    uiType: "hotel",
  },
  {
    filter: {
      name: {
        $regex:
          /doctor|clinic|hospital|dentist|physiotherapist/i,
      },
    },
    uiType: "appointment",
  },
  {
    filter: {
      name: {
        $regex:
          /shopping|grocery|supermarket|electronics|fashion/i,
      },
    },
    uiType: "shopping",
  },
];

for (const item of updates) {
  const result = await Category.updateMany(
    item.filter,
    { $set: { uiType: item.uiType } }
  );

  console.log(
    `${item.uiType}: ${result.modifiedCount} updated`
  );
}

// Baaki sab categories ko service bana do
const result = await Category.updateMany(
  { uiType: { $exists: false } },
  { $set: { uiType: "service" } }
);

console.log(
  `service: ${result.modifiedCount} updated`
);

await mongoose.disconnect();
console.log("Done.");