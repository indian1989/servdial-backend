import Category from "../../models/Category.js";
import memoryCache from "../../utils/memoryCache.js";

/**
 * =========================================================
 * 🧠 CATEGORY RESOLVER (FINAL SSOT VERSION)
 * =========================================================
 * RESPONSIBILITY:
 * - slug → category resolution
 * - slugHistory fallback
 * - parent → leaf expansion
 * - cache management
 *
 * MUST NOT:
 * - know routes
 * - rank businesses
 * - query businesses
 * =========================================================
 */

const CACHE_TTL = 60 * 60 * 6;

/* =========================================================
   🧠 RESOLVE CATEGORY BY SLUG
   ========================================================= */

export const resolveCategoryBySlug = async (
  slug
) => {
  if (!slug) return null;

  const normalizedSlug = slug.trim();

  const cacheKey =
    `category:slug:${normalizedSlug}`;

  // =====================================================
  // CACHE
  // =====================================================

  const cached = memoryCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  // =====================================================
  // PRIMARY SLUG MATCH
  // =====================================================

  let category = await Category.findOne({
    slug: normalizedSlug,
  }).lean();

  // =====================================================
  // SLUG HISTORY FALLBACK
  // =====================================================

  if (!category) {
    category = await Category.findOne({
      "slugHistory.slug": normalizedSlug,
    }).lean();
  }

  if (!category) {
    return null;
  }

  // =====================================================
  // CACHE STORE
  // =====================================================

  memoryCache.set(
    cacheKey,
    category,
    CACHE_TTL
  );

  return category;
};

/* =========================================================
   🌳 GET CHILD CATEGORY IDS (RECURSIVE SAFE)
   ========================================================= */

export const getLeafCategoryIds = async (
  parentId
) => {
  if (!parentId) return [];

  const cacheKey =
    `category:parent:${parentId}`;

  // =====================================================
  // CACHE
  // =====================================================

  const cached = memoryCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  // =====================================================
  // FETCH DIRECT CHILDREN
  // =====================================================

  const children = await Category.find({
    parentCategory: parentId,
    status: "active",
  })
    .select("_id")
    .lean();

  // =====================================================
  // NO CHILDREN = SELF IS LEAF
  // =====================================================

  if (!children.length) {
    const result = [parentId];

    memoryCache.set(
      cacheKey,
      result,
      CACHE_TTL
    );

    return result;
  }

  // =====================================================
  // INCLUDE ALL CHILD IDS
  // =====================================================

  const leafIds = children.map(
    (c) => c._id
  );

  memoryCache.set(
    cacheKey,
    leafIds,
    CACHE_TTL
  );

  return leafIds;
};

/* =========================================================
   🧠 RESOLVE FULL CATEGORY CONTEXT
   ========================================================= */

export const resolveCategoryContext = async (
  slug
) => {
  const category =
    await resolveCategoryBySlug(slug);

  if (!category) {
    return null;
  }

  const leafCategoryIds =
    await getLeafCategoryIds(category._id);

  return {
    category,

    primaryCategoryId: category._id,

    leafCategoryIds,
  };
};