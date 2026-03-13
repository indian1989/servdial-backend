import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      default: "",
    },

    message: {
      type: String,
      default: "",
    },

    city: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["new", "contacted", "converted"],
      default: "new",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Lead", leadSchema);