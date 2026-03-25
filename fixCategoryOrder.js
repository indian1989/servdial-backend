import mongoose from "mongoose";
import dotenv from "dotenv";
import Category from "./models/Category.js"; // Adjust path if needed

dotenv.config(); // if you are using .env for DB connection

const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch((err) => console.error("MongoDB connection error:", err));

const fixOrders = async () => {
  try {
    const categories = await Category.find({});
    console.log(`Found ${categories.length} categories`);

    for (let cat of categories) {
      if (typeof cat.order !== "number") {
        cat.order = Number(cat.order) || 0;
        await cat.save();
        console.log(`Fixed order for category: ${cat.name} → ${cat.order}`);
      }
    }

    console.log("✅ All category orders fixed!");
    process.exit(0);
  } catch (err) {
    console.error("Error fixing orders:", err);
    process.exit(1);
  }
};

fixOrders();