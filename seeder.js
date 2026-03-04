// backend/seeder.js
import bcrypt from "bcryptjs";
import User from "./models/User.js";

export const seedSuperAdmin = async () => {
  try {
    console.log("🛠️ Starting superadmin seeding...");

    // Env vars
    const superAdminEmail = process.env.SUPERADMIN_EMAIL;
    const plainPassword = process.env.SUPERADMIN_PASSWORD;
    const superAdminName = process.env.SUPERADMIN_NAME || "Super Admin";

    if (!superAdminEmail || !plainPassword) {
      console.error("❌ SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD not set in environment variables");
      return;
    }

    // Check if superadmin exists
    const existing = await User.findOne({ role: "superadmin" });
    if (existing) {
      console.log("🗑️ Existing superadmin found. Deleting...");
      await User.deleteOne({ role: "superadmin" });
      console.log("✅ Existing superadmin deleted");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Create superadmin
    await User.create({
      name: superAdminName,
      email: superAdminEmail,
      password: hashedPassword,
      role: "superadmin",
      isVerified: true,
      isActive: true,
    });

    console.log("✅ New superadmin created successfully!");
    console.log("📧 Email:", superAdminEmail);
    console.log("🔑 Password:", plainPassword);
  } catch (err) {
    console.error("❌ Seeder error:", err);
  }
};