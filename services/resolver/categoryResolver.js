import Category from "../../models/Category.js";
import memoryCache from "../../utils/memoryCache.js";


// =============================
// 🧠 RESOLVE CATEGORY BY SLUG
// =============================
export const resolveCategoryBySlug = async (slug) => {
  const cacheKey = `category:slug:${slug}`;

  // ✅ 1. Cache
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached;

  // =============================
  // 2. Find by slug
  // =============================
  let category = await Category.findOne({ slug }).lean();

  // =============================
  // 3. Fallback → slugHistory
  // =============================
  if (!category) {
    category = await Category.findOne({
      "slugHistory.slug": slug,
    }).lean();
  }

  if (!category) return null;

  // =============================
  // 4. Cache
  // =============================
  memoryCache.set(cacheKey, category, 60 * 60 * 6);

  return category;
};



// =============================
// 🌳 GET LEAF CATEGORY IDS
// =============================
export const getLeafCategoryIds = async (parentId) => {
  const cacheKey = `category:parent:${parentId}`;

  // ✅ 1. Cache
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached;

  // =============================
  // 2. Fetch children (leaf level)
  // =============================
  const children = await Category.find({
    parentCategory: parentId,
    level: 1,
    status: "active",
  })
    .select("_id")
    .lean();

  const leafIds = children.map((c) => c._id);

  // =============================
  // 3. Cache result
  // =============================
  memoryCache.set(cacheKey, leafIds, 60 * 60 * 6);

  return leafIds;
};