import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    excerpt: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    content: {
      type: String,
      required: true,
    },

    featuredImage: {
      type: String,
      trim: true,
      default: "",
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BlogCategory",
      default: null,
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    // ================= PIN POST =================
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },

    seo: {
      title: {
        type: String,
        trim: true,
        maxlength: 200,
        default: "",
      },

      description: {
        type: String,
        trim: true,
        maxlength: 320,
        default: "",
      },

      canonicalUrl: {
        type: String,
        trim: true,
        default: "",
      },

      ogTitle: {
        type: String,
        trim: true,
        maxlength: 200,
        default: "",
      },

      ogDescription: {
        type: String,
        trim: true,
        maxlength: 320,
        default: "",
      },

      ogImage: {
        type: String,
        trim: true,
        default: "",
      },

      twitterTitle: {
        type: String,
        trim: true,
        maxlength: 200,
        default: "",
      },

      twitterDescription: {
        type: String,
        trim: true,
        maxlength: 320,
        default: "",
      },

      twitterImage: {
        type: String,
        trim: true,
        default: "",
      },
    },

    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    views: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Blog = mongoose.model("Blog", blogSchema);

export default Blog;