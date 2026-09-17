// Path: backend/controllers/blogController.js

import Blog from "../models/Blog.js";

/*
=================================================
 AUTO-GENERATE BLOG SEO
=================================================
*/
const stripHtml = (value = "") =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const generateBlogSEO = ({
  title = "",
  excerpt = "",
  content = "",
  featuredImage = "",
  slug = "",
}) => {
  const seoTitle = `${title.trim()} | ServDial`.slice(0, 200);

  const descriptionSource =
    excerpt?.trim() || stripHtml(content);

  const seoDescription = descriptionSource.slice(0, 320);

  const canonicalUrl = `https://servdial.com/blog/${slug}`;

  const image = featuredImage?.trim() || "";

  return {
    title: seoTitle,
    description: seoDescription,
    canonicalUrl,
    ogTitle: seoTitle,
    ogDescription: seoDescription,
    ogImage: image,
    twitterTitle: seoTitle,
    twitterDescription: seoDescription,
    twitterImage: image,
  };
};

/*
=================================================
 CREATE BLOG POST
=================================================
*/
export const createBlog = async (req, res) => {
  try {
    const {
      title,
      slug,
      excerpt,
      content,
      featuredImage,
      author,
      category,
      status,
      publishedAt,
      tags,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required.",
      });
    }

    const normalizedSlug = slug?.toLowerCase().trim();

    const existingBlog = slug
      ? await Blog.findOne({ slug: normalizedSlug })
      : null;

    if (existingBlog) {
      return res.status(409).json({
        success: false,
        message: "A blog post with this slug already exists.",
      });
    }

    const blogSEO = generateBlogSEO({
      title,
      excerpt,
      content,
      featuredImage,
      slug: normalizedSlug,
    });

    const blog = await Blog.create({
      title: title.trim(),
      slug: normalizedSlug,
      excerpt,
      content,
      featuredImage,
      author: author || req.user?._id || null,
      category: category || null,
      status: status || "draft",
      publishedAt:
        status === "published"
          ? publishedAt || new Date()
          : null,
      seo: blogSEO,
      tags,
    });

    return res.status(201).json({
      success: true,
      message: "Blog post created successfully.",
      data: blog,
    });
  } catch (error) {
    console.error("Create Blog Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create blog post.",
      error: error.message,
    });
  }
};


// ==================== TOGGLE PIN ====================

export const toggleBlogPin = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found",
      });
    }

    blog.isPinned = !blog.isPinned;

    await blog.save();

    return res.status(200).json({
      success: true,
      message: blog.isPinned
        ? "Blog post pinned successfully"
        : "Blog post unpinned successfully",
      data: blog,
    });
  } catch (error) {
    console.error("❌ Toggle Blog Pin Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update pin status",
      error: error.message,
    });
  }
};

/*
=================================================
 GET ALL BLOG POSTS - ADMIN
=================================================
*/
export const getAllBlogs = async (req, res) => {
  try {
    const {
      status,
      category,
      page = 1,
      limit = 10,
      search,
    } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        {
          title: {
            $regex: search,
            $options: "i",
          },
        },
        {
          excerpt: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [blogs, total] = await Promise.all([
      Blog.find(filter)
        .populate("author", "name email")
        .populate("category", "name slug")
        .sort({
          isPinned: -1,
          publishedAt: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(Number(limit))
        .lean(),

      Blog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: blogs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get All Blogs Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch blog posts.",
      error: error.message,
    });
  }
};


/*
=================================================
 GET PUBLISHED BLOG POSTS - PUBLIC
=================================================
*/
export const getPublishedBlogs = async (req, res) => {
  try {
    const {
      category,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {
      status: "published",
    };

    if (category) {
      filter.category = category;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [blogs, total] = await Promise.all([
      Blog.find(filter)
        .populate("author", "name")
        .populate("category", "name slug")
        .sort({
          isPinned: -1,
          publishedAt: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(Number(limit))
        .lean(),

      Blog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: blogs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get Published Blogs Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch published blog posts.",
      error: error.message,
    });
  }
};


/*
=================================================
 GET SINGLE BLOG BY SLUG - PUBLIC
=================================================
*/
export const getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const blog = await Blog.findOne({
      slug: slug.toLowerCase(),
      status: "published",
    })
      .populate("author", "name")
      .populate("category", "name slug")
      .lean();

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    console.error("Get Blog By Slug Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch blog post.",
      error: error.message,
    });
  }
};


/*
=================================================
 GET BLOG BY ID - ADMIN
=================================================
*/
export const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id)
      .populate("author", "name email")
      .populate("category", "name slug")
      .lean();

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    console.error("Get Blog By ID Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch blog post.",
      error: error.message,
    });
  }
};


/*
=================================================
 UPDATE BLOG POST
=================================================
*/
export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const existingBlog = await Blog.findById(id);

    if (!existingBlog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found.",
      });
    }

    const {
      title,
      slug,
      excerpt,
      content,
      featuredImage,
      author,
      category,
      status,
      publishedAt,
      tags,
    } = req.body;

    if (slug) {
      const normalizedSlug = slug.toLowerCase().trim();

      const duplicateSlug = await Blog.findOne({
        slug: normalizedSlug,
        _id: { $ne: id },
      });

      if (duplicateSlug) {
        return res.status(409).json({
          success: false,
          message: "A blog post with this slug already exists.",
        });
      }

      existingBlog.slug = normalizedSlug;
    }

    if (title !== undefined) existingBlog.title = title.trim();
    if (excerpt !== undefined) existingBlog.excerpt = excerpt;
    if (content !== undefined) existingBlog.content = content;
    if (featuredImage !== undefined)
      existingBlog.featuredImage = featuredImage;

    if (author !== undefined) existingBlog.author = author;
    if (category !== undefined) existingBlog.category = category;

    if (status !== undefined) {
      existingBlog.status = status;

      if (status === "published" && !existingBlog.publishedAt) {
        existingBlog.publishedAt = new Date();
      }

      if (status === "draft") {
        existingBlog.publishedAt = null;
      }
    }

    if (publishedAt !== undefined) {
      existingBlog.publishedAt = publishedAt;
    }

    if (tags !== undefined) existingBlog.tags = tags;

    // Auto-generate SEO from current blog content
    existingBlog.seo = generateBlogSEO({
      title: existingBlog.title,
      excerpt: existingBlog.excerpt,
      content: existingBlog.content,
      featuredImage: existingBlog.featuredImage,
      slug: existingBlog.slug,
    });

    await existingBlog.save();

    return res.status(200).json({
      success: true,
      message: "Blog post updated successfully.",
      data: existingBlog,
    });
  } catch (error) {
    console.error("Update Blog Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update blog post.",
      error: error.message,
    });
  }
};


/*
=================================================
 DELETE BLOG POST
=================================================
*/
export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found.",
      });
    }

    await Blog.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Blog post deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Blog Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete blog post.",
      error: error.message,
    });
  }
};


/*
=================================================
 INCREMENT BLOG VIEWS
=================================================
*/
export const incrementBlogViews = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findOneAndUpdate(
      {
        _id: id,
        status: "published",
      },
      {
        $inc: {
          views: 1,
        },
      },
      {
        new: true,
      }
    ).select("views");

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        views: blog.views,
      },
    });
  } catch (error) {
    console.error("Increment Blog Views Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update blog views.",
      error: error.message,
    });
  }
};