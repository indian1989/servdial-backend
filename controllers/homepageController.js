import Category from "../models/Category.js";
import Business from "../models/Business.js";
import City from "../models/City.js";
import Banner from "../models/Banner.js";

export const getHomepageData = async (req, res) => {
  try {

    const [
      categories,
      featuredBusinesses,
      topRatedBusinesses,
      latestBusinesses,
      cities,
      banners
    ] = await Promise.all([

      Category.find({ isActive: true })
        .sort({ order: 1 })
        .limit(12),

      Business.find({ isFeatured: true, isApproved: true })
        .limit(8)
        .populate("category city"),

      Business.find({ isApproved: true })
        .sort({ rating: -1 })
        .limit(8)
        .populate("category city"),

      Business.find({ isApproved: true })
        .sort({ createdAt: -1 })
        .limit(8)
        .populate("category city"),

      City.find({ isPopular: true })
        .limit(8),

      Banner.find({ isActive: true })
    ]);

    res.json({
      success: true,
      categories,
      featuredBusinesses,
      topRatedBusinesses,
      latestBusinesses,
      cities,
      banners
    });

  } catch (error) {

    console.error("Homepage error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load homepage"
    });

  }
};