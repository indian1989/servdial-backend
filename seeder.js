// backend/seeder.js
import bcrypt from "bcryptjs";
import User from "./models/User.js";

export const seedSuperAdmin = async () => {
  try {
    console.log("🛠️ Checking for existing superadmin...");

    // Env vars
    const superAdminEmail = process.env.SUPERADMIN_EMAIL;
    const plainPassword = process.env.SUPERADMIN_PASSWORD;
    const superAdminName = process.env.SUPERADMIN_NAME || "Super Admin";

    if (!superAdminEmail || !plainPassword) {
      console.error(
        "❌ SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD not set in environment variables"
      );
      return;
    }

    // ✅ Only create if superadmin with the given email doesn't exist
    const existing = await User.findOne({ email: superAdminEmail, role: "superadmin" });
    if (existing) {
      console.log("✅ Superadmin already exists. Skipping creation.");
      return;
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

// Optional: Run manually from terminal
if (process.argv[2] === "--run") {
  seedSuperAdmin().then(() => process.exit(0));
}