// backend/controllers/seoController.js
import City from "../models/City.js";
import Category from "../models/Category.js";
import Business from "../models/Business.js";
//import memoryCache from "../utils/memoryCache.js"; // or wherever it is ( temporarly commented need fix)

const baseUrl = "https://servdial.com";

// ================ GENERATE CITY CATEGORY PAGE ===============
export const generateCityCategoryPages = async (req, res) => {
  try {
    const cities = await City.find({ status: "active" })
      .select("slug name")
      .lean();

    const categories = await Category.find({ status: "active" })
      .select("slug name parentCategory")
      .lean();

    // 👉 only leaf categories
    const leafCategories = categories.filter(
      (cat) => cat.parentCategory !== null
    );

    let pages = [];

    cities.forEach((city) => {
      leafCategories.forEach((cat) => {
        pages.push({
          city: city.slug,
          category: cat.slug,
          url: `${baseUrl}/${city.slug}/${cat.slug}`,
          title: `${cat.name} in ${city.name} | ServDial`,
        });
      });
    });

    return res.json({
      success: true,
      data: pages,
      meta: {
        totalPages: pages.length,
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

// ============= GET CITY CATEGORY PAGE ==================
export const getCityCategoryPage = async (req, res) => {
  try {
    const { citySlug, categorySlug } = req.params;

    // ================= CACHE =================
    let cityId = memoryCache.get(`city:slug:${citySlug}`);
    let category = memoryCache.get(`category:slug:${categorySlug}`);

    // ================= CITY RESOLUTION =================
    if (!cityId) {
      const city =
        (await City.findOne({ slug: citySlug })) ||
        (await City.findOne({ slugHistory: citySlug }));

      if (!city) {
        return res.status(404).json({
          success: false,
          message: "City not found",
        });
      }

      cityId = city._id;
      memoryCache.set(`city:slug:${citySlug}`, cityId, 60 * 60 * 6);
    }

    // ================= CATEGORY RESOLUTION =================
    if (!category) {
      const categoryDoc =
        (await Category.findOne({ slug: categorySlug })) ||
        (await Category.findOne({ slugHistory: categorySlug }));

      if (!categoryDoc) {
        return res.json({
          success: true,
          data: [],
          meta: {
            message: "Category not found",
          },
        });
      }

      category = categoryDoc;
      memoryCache.set(`category:slug:${categorySlug}`, categoryDoc, 60 * 60 * 6);
    }

    // ================= CATEGORY EXPANSION =================
    let categoryIds = [category._id];

   const isParentCategory =
  category.parentCategory &&
  typeof category.parentCategory === "object";

if (isParentCategory) {
      const leafCats = await Category.find({
        parentCategory: category._id,
      })
        .select("_id")
        .lean();

      categoryIds = leafCats.map((c) => c._id);
    }

    if (!cityId || !category) {
  return res.status(404).json({
    success: false,
    message: "Invalid SEO route",
  });
}

    // ================= QUERY =================
    const businesses = await Business.find({
  cityId,
  $or: [
    { categoryId: { $in: categoryIds } },
    { parentCategoryId: { $in: categoryIds } }
  ],
  status: "approved",
})
      .select("name slug rating location images views clicks")
      .lean();

    // ================= FAILSAFE =================
    if (!businesses.length) {
      return res.json({
        success: true,
        data: [],
        meta: {
          message: "No businesses found",
        },
      });
    }

    // ================= RANKING =================
    const ranked = rankBusinesses(businesses, {
      userLocation: null,
      userPreferences: null,
      searchIntent: null,
      timeOfDay: new Date().getHours(),
    });

    // ================= RESPONSE =================
    return res.json({
      success: true,
      data: ranked,
      meta: {
        total: ranked.length,
        city: { slug: citySlug },
        category: { slug: categorySlug },
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