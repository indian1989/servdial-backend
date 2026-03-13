import mongoose from "mongoose";
import slugify from "../utils/slugify.js";
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
    },

    icon: {
      type: String,
    },

    image: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);


// ================= AUTO CREATE SLUG =================
categorySchema.pre("save", function (next) {

  if (this.isModified("name")) {

    this.slug = slugify(this.name);
  }

  next();

});

export default mongoose.model("Category", categorySchema);