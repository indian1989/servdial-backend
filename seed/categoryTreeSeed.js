import mongoose from "mongoose";
import dotenv from "dotenv";
import Category from "../models/Category.js";

dotenv.config();

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  await Category.deleteMany();

  console.log("🧹 Old categories removed");

  // ================= PARENT =================
  const homeServices = await Category.create({
    name: "Home Services",
    order: 1,
  });

  const personalCare = await Category.create({
    name: "Personal Care",
    order: 2,
  });

  const repairServices = await Category.create({
    name: "Repair Services",
    order: 3,
  });

  // ================= CHILD =================
  const plumber = await Category.create({
    name: "Plumber",
    parentCategory: homeServices._id,
    order: 1,
  });

  const electrician = await Category.create({
    name: "Electrician",
    parentCategory: homeServices._id,
    order: 2,
  });

  const salon = await Category.create({
    name: "Salon",
    parentCategory: personalCare._id,
    order: 1,
  });

  const acRepair = await Category.create({
    name: "AC Repair",
    parentCategory: repairServices._id,
    order: 1,
  });

  // ================= SUB-CHILD =================
  await Category.create({
    name: "Bathroom Plumbing",
    parentCategory: plumber._id,
    order: 1,
  });

  await Category.create({
    name: "Kitchen Plumbing",
    parentCategory: plumber._id,
    order: 2,
  });

  await Category.create({
    name: "Hair Salon",
    parentCategory: salon._id,
    order: 1,
  });

  await Category.create({
    name: "Beauty Parlour",
    parentCategory: salon._id,
    order: 2,
  });

  console.log("✅ Category tree seeded successfully");

  process.exit();
};

seed();