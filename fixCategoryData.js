import mongoose from "mongoose";
import dotenv from "dotenv";
import Category from "./models/Category.js";
import slugify from "./utils/slugify.js";

dotenv.config();

const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:", err));

const fixCategories = async () => {
  try {
    const categories = await Category.find({});
    console.log(`Found ${categories.length} categories`);

    for (let cat of categories) {
      let updated = false;

      // Fix order
      if (typeof cat.order !== "number") {
        cat.order = Number(cat.order) || 0;
        updated = true;
      }

      // Fix slug without changing name
      const correctSlug = cat.name ? slugify(cat.name) : "";
      if (cat.slug !== correctSlug) {
        cat.slug = correctSlug;
        updated = true;
      }

      if (updated) {
        await cat.save();
        console.log(`Fixed: ${cat.name} → order: ${cat.order}, slug: ${cat.slug}`);
      }
    }

    console.log("✅ All categories fixed!");
    process.exit(0);
  } catch (err) {
    console.error("Error fixing categories:", err);
    process.exit(1);
  }
};

fixCategories();