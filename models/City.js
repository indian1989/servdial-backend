import mongoose from "mongoose";

const citySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },

    country: {
      type: String,
      default: "India",
    },

    latitude: {
      type: Number,
    },

    longitude: {
      type: Number,
    },

    featured: {
      type: Boolean,
      default: false,
    },

    popular: {
      type: Boolean,
      default: false,
    },

    image: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

citySchema.pre("save", function (next) {

  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");
  }

  next();
});

export default mongoose.model("City", citySchema);