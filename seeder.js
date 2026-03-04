// backend/seeder.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "./models/User.js";

dotenv.config();

// ================== MongoDB Connection ==================
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};

// ================== Seeder Function ==================
const seedSuperAdmin = async () => {
  try {
    // 1️⃣ Delete existing superadmin (if any)
    const existing = await User.findOne({ role: "superadmin" });
    if (existing) {
      await User.deleteOne({ role: "superadmin" });
      console.log("🗑️ Existing superadmin deleted");
    }

    // 2️⃣ Define superadmin credentials
    const plainPassword = "ImThere4you@anycost"; // <-- set your desired superadmin password here ✅
    const hashedPassword = await bcrypt.hash(plainPassword, 10); // 10 salt rounds

    const superAdminEmail = "rahmathussain.hjp@gmail.com"; // <-- set your desired superadmin email here ✅

    // 3️⃣ Create new superadmin
    await User.create({
      name: "Super Admin",
      email: superAdminEmail,   // <-- email for DB ✅
      password: hashedPassword, // <-- hashed password stored in DB ✅
      role: "superadmin",
      isVerified: true,
      isActive: true,
    });

    // 4️⃣ Console output (for reference only, DB me plain password store nahi hota)
    console.log("✅ New superadmin created successfully!");
    console.log("📧 Email:", superAdminEmail);  // <-- displayed in console ✅
    console.log("🔑 Password:", plainPassword); // <-- displayed in console ✅

    process.exit();
  } catch (err) {
    console.error("❌ Seeder error:", err);
    process.exit(1);
  }
};

// ================== Run Seeder ==================
const runSeeder = async () => {
  await connectDB();
  await seedSuperAdmin();
};

runSeeder();