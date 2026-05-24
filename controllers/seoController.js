import City from "../models/City.js";
import Category from "../models/Category.js";
import Business from "../models/Business.js";
import { getCache, setCache } from "../utils/memoryCache.js";
import { rankBusinesses } from "../services/ranking/unifiedRankingEngine.js";

const baseUrl = "https://servdial.com";

/* ===================== CITY + CATEGORY PAGE BUILDER ===================== */

export const generateCityCategoryPages = async (req, res) => {
  try {
    const cities = await City.find({ status: "active" })
      .select("slug name")
      .lean();

    const categories = await Category.find({ status: "active" })
      .select("slug name parentCategory")
      .lean();

    // ONLY LEAF CATEGORIES (SAFE FIX)
    const leafCategories = categories.filter(
      (cat) => !cat.parentCategory
    );

    const pages = [];

    for (const city of cities) {
      for (const cat of leafCategories) {
        pages.push({
          city: city.slug,
          category: cat.slug,
          url: `${baseUrl}/${city.slug}/${cat.slug}`,
          title: `${cat.name} in ${city.name} | ServDial`,
        });
      }
    }

    return res.json({
      success: true,
      data: pages,
      meta: {
        total: pages.length,
      },
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error generating SEO pages",
    });
  }
};

/* ===================== CITY + CATEGORY PAGE ===================== */

export const getCityCategoryPage = async (req, res) => {
  try {
    const { citySlug, categorySlug } = req.params;

    /* ================= CITY ================= */
    let city = getCache(`city:slug:${citySlug}`);

    if (!city) {
      city = await City.findOne({
        $or: [
          { slug: citySlug },
          { "slugHistory.slug": citySlug }
        ]
      }).lean();

      if (!city) {
        return res.status(404).json({
          success: false,
          message: "City not found",
        });
      }

      setCache(`city:slug:${citySlug}`, city, 60 * 60 * 6);
    }

    /* ================= CATEGORY ================= */
    let category = getCache(`category:slug:${categorySlug}`);

    if (!category) {
      category = await Category.findOne({
        $or: [
          { slug: categorySlug },
          { "slugHistory.slug": categorySlug }
        ]
      }).lean();

      if (!category) {
        return res.json({
          success: true,
          data: [],
          meta: {
            message: "Category not found",
          },
        });
      }

      setCache(`category:slug:${categorySlug}`, category, 60 * 60 * 6);
    }

    /* ================= CATEGORY IDS (FIXED LOGIC) ================= */

    let categoryIds = [];

    // If parent category → include ALL children + itself
    if (!category.parentCategory) {
      const children = await Category.find({
        $or: [
          { parentCategory: category._id },
          { _id: category._id }
        ]
      })
        .select("_id")
        .lean();

      categoryIds = children.map((c) => c._id);
    } else {
      categoryIds = [category._id];
    }

    /* ================= BUSINESSES ================= */

    const businesses = await Business.find({
      cityId: city._id,
      categoryId: { $in: categoryIds },
      status: "approved",
    })
      .select("name slug averageRating location images views clicks")
      .lean();

    if (!businesses.length) {
      return res.json({
        success: true,
        data: [],
        meta: {
          message: "No businesses found",
          city: city.slug,
          category: category.slug,
        },
      });
    }

    /* ================= RANKING ================= */

   const ranked = rankBusinesses(businesses, {
      userLocation: null,
      userPreferences: null,
      searchIntent: null,
      timeOfDay: new Date().getHours(),
    });

    return res.json({
      success: true,
      data: ranked,
      meta: {
        total: ranked.length,
        city: city.slug,
        category: category.slug,
      },
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};