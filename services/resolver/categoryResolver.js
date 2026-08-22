// backend/services/resolver/categoryResolver.js

import Category from "../../models/Category.js";
import memoryCache from "../../utils/memoryCache.js";

/**
 * =========================================================
 * 🧠 CATEGORY RESOLVER — FINAL SSOT VERSION
 * =========================================================
 *
 * RESPONSIBILITY:
 *
 * - Resolve category slug → category
 * - Support slugHistory
 * - Normalize category slug
 * - Expand parent category → leaf categories
 * - Support nested category trees
 * - Cache resolved category data
 *
 * MUST NOT:
 *
 * - Query businesses
 * - Rank businesses
 * - Parse search queries
 * - Perform semantic mapping
 * - Know routes
 *
 * =========================================================
 */

const CACHE_TTL = 60 * 60 * 6; // 6 hours

/* =========================================================
   NORMALIZE CATEGORY SLUG
========================================================= */

const normalizeCategorySlug = (value = "") => {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/* =========================================================
   CACHE KEYS
========================================================= */

const categorySlugCacheKey = (slug) =>
  `category:slug:${slug}`;

const categoryChildrenCacheKey = (id) =>
  `category:children:${String(id)}`;

const categoryLeafCacheKey = (id) =>
  `category:leaf:${String(id)}`;

/* =========================================================
   INVALIDATE CATEGORY CACHE
   - slug cache
   - tree cache
   - children cache
   - leaf cache
   - ancestor leaf caches
========================================================= */

export const invalidateCategoryCache = async ({
  categoryId = null,
  slug = null,
  oldSlug = null,
  parentCategoryId = null,
  oldParentCategoryId = null,
} = {}) => {

  /* =======================================================
     GLOBAL TREE CACHE
  ======================================================= */

  memoryCache.del(
    "categories:tree"
  );


  /* =======================================================
     CURRENT SLUG CACHE
  ======================================================= */

  if (slug) {

    memoryCache.del(
      categorySlugCacheKey(
        normalizeCategorySlug(slug)
      )
    );

  }


  /* =======================================================
     OLD SLUG CACHE
  ======================================================= */

  if (oldSlug) {

    memoryCache.del(
      categorySlugCacheKey(
        normalizeCategorySlug(oldSlug)
      )
    );

  }


  /* =======================================================
     CATEGORY SELF CACHE
  ======================================================= */

  if (categoryId) {

    memoryCache.del(
      categoryChildrenCacheKey(
        categoryId
      )
    );

    memoryCache.del(
      categoryLeafCacheKey(
        categoryId
      )
    );

  }


  /* =======================================================
     COLLECT ALL ANCESTORS
  ======================================================= */

  const ancestorIds = new Set();

  const collectAncestors = async (
    startId
  ) => {

    let currentId =
      startId;

    const visited =
      new Set();


    while (currentId) {

      const currentKey =
        String(currentId);


      /* ===============================================
         CYCLE PROTECTION
      =============================================== */

      if (
        visited.has(currentKey)
      ) {

        console.warn(
          "⚠️ CATEGORY CACHE ANCESTOR CYCLE:",
          currentKey
        );

        break;

      }


      visited.add(
        currentKey
      );


      /* ===============================================
         STORE ANCESTOR
      =============================================== */

      ancestorIds.add(
        currentKey
      );


      /* ===============================================
         LOAD PARENT
      =============================================== */

      const current =
        await Category.findById(
          currentId
        )
        .select(
          "parentCategory"
        )
        .lean();


      if (
        !current?.parentCategory
      ) {

        break;

      }


      currentId =
        current.parentCategory;

    }

  };


  /* =======================================================
     CURRENT CATEGORY / PARENT CHAIN
  ======================================================= */

  if (parentCategoryId) {

    await collectAncestors(
      parentCategoryId
    );

  }


  /* =======================================================
     OLD PARENT CHAIN
     
     Important when a category moves from
     Parent A → Parent B.
  ======================================================= */

  if (
    oldParentCategoryId &&
    String(oldParentCategoryId) !==
      String(parentCategoryId || "")
  ) {

    await collectAncestors(
      oldParentCategoryId
    );

  }


  /* =======================================================
     CATEGORY'S OWN CURRENT PARENT CHAIN
     
     This ensures the current hierarchy is covered even
     when only categoryId was supplied.
  ======================================================= */

  if (categoryId) {

    const category =
      await Category.findById(
        categoryId
      )
      .select(
        "parentCategory"
      )
      .lean();


    if (
      category?.parentCategory
    ) {

      await collectAncestors(
        category.parentCategory
      );

    }

  }


  /* =======================================================
     INVALIDATE ALL ANCESTOR CACHES
  ======================================================= */

  for (
    const ancestorId
    of ancestorIds
  ) {

    memoryCache.del(
      categoryChildrenCacheKey(
        ancestorId
      )
    );

    memoryCache.del(
      categoryLeafCacheKey(
        ancestorId
      )
    );

  }

};

/* =========================================================
   RESOLVE CATEGORY BY SLUG
========================================================= */

/**
 * Resolution order:
 *
 * 1. Exact canonical slug
 * 2. slugHistory
 *
 * Category name fallback is intentionally NOT used here.
 *
 * Search architecture should resolve categories through
 * canonical slugs wherever possible.
 */

export const resolveCategoryBySlug = async (
  slug
) => {
  if (!slug) {
    return null;
  }

  const normalizedSlug =
    normalizeCategorySlug(slug);

  if (!normalizedSlug) {
    return null;
  }

  const cacheKey =
    categorySlugCacheKey(
      normalizedSlug
    );

  /* =======================================================
     CACHE
  ======================================================= */

  const cached =
    memoryCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  /* =======================================================
     1️⃣ EXACT SLUG
  ======================================================= */

  let category =
    await Category.findOne({
      slug: normalizedSlug,
      status: "active",
    })
      .lean();

  /* =======================================================
     2️⃣ SLUG HISTORY
  ======================================================= */

  if (!category) {
    category =
      await Category.findOne({
        "slugHistory.slug": normalizedSlug,
        status: "active",
      })
        .lean();
  }

  /* =======================================================
     NOT FOUND
  ======================================================= */

  if (!category) {
    return null;
  }

  /* =======================================================
     CACHE
  ======================================================= */

  memoryCache.set(
    cacheKey,
    category,
    CACHE_TTL
  );

  /*
   * If a historical slug was used, also cache the
   * canonical current slug.
   */

  if (category.slug) {
    const canonicalSlug =
      normalizeCategorySlug(
        category.slug
      );

    if (
      canonicalSlug &&
      canonicalSlug !== normalizedSlug
    ) {
      memoryCache.set(
        categorySlugCacheKey(
          canonicalSlug
        ),
        category,
        CACHE_TTL
      );
    }
  }

  return category;
};

/* =========================================================
   GET DIRECT CHILDREN
========================================================= */

/**
 * Returns direct active children of a category.
 *
 * This function does NOT recursively expand children.
 */

const getDirectChildren = async (
  parentId
) => {
  if (!parentId) {
    return [];
  }

  const cacheKey =
    categoryChildrenCacheKey(
      parentId
    );

  const cached =
    memoryCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const children =
  await Category.find({
    parentCategory: parentId,
    status: "active",
  })
    .select(
      "_id name slug parentCategory status order"
    )
    .sort({
      order: 1,
      name: 1,
    })
    .lean();

  memoryCache.set(
    cacheKey,
    children,
    CACHE_TTL
  );

  return children;
};

/* =========================================================
   GET LEAF CATEGORY IDS
========================================================= */

/**
 * Recursively expands a category tree.
 *
 * Example:
 *
 * Services
 *   └── Home Services
 *         ├── Plumbing
 *         └── Electrical
 *
 * Resolving "Services" returns:
 *
 * [
 *   PlumbingId,
 *   ElectricalId
 * ]
 *
 * If the requested category itself has no children:
 *
 * [
 *   categoryId
 * ]
 *
 * =========================================================
 *
 * visited:
 *
 * Protects against accidental circular category
 * references in the database.
 */

export const getLeafCategoryIds = async (
  parentId,
  visited = new Set()
) => {
  if (!parentId) {
    return [];
  }

  const parentKey =
    String(parentId);

  /* =======================================================
     CIRCULAR REFERENCE PROTECTION
  ======================================================= */

  if (visited.has(parentKey)) {
    console.warn(
      "⚠️ CATEGORY CYCLE DETECTED:",
      parentKey
    );

    return [];
  }

  visited.add(parentKey);

  /* =======================================================
     CACHE
  ======================================================= */

  /*
   * Only use the normal cache when this is the root
   * invocation. Recursive calls must independently
   * evaluate their own children.
   */

  const isRootCall =
    visited.size === 1;

  const cacheKey =
    categoryLeafCacheKey(
      parentKey
    );

  if (isRootCall) {
    const cached =
      memoryCache.get(cacheKey);

    if (cached) {
      return cached;
    }
  }

  /* =======================================================
     FETCH DIRECT CHILDREN
  ======================================================= */

  const children =
    await getDirectChildren(
      parentId
    );

  /* =======================================================
     NO CHILDREN = LEAF
  ======================================================= */

  if (!children.length) {
    const result = [parentId];

    if (isRootCall) {
      memoryCache.set(
        cacheKey,
        result,
        CACHE_TTL
      );
    }

    return result;
  }

  /* =======================================================
     RECURSIVE EXPANSION
  ======================================================= */

  const leafIds = [];

  for (const child of children) {
    const childLeafIds =
      await getLeafCategoryIds(
        child._id,
        new Set(visited)
      );

    leafIds.push(
      ...childLeafIds
    );
  }

  /* =======================================================
     REMOVE DUPLICATES
  ======================================================= */

  const uniqueIds = [
    ...new Map(
      leafIds.map((id) => [
        String(id),
        id,
      ])
    ).values(),
  ];

  /* =======================================================
     CACHE ROOT RESULT
  ======================================================= */

  if (isRootCall) {
    memoryCache.set(
      cacheKey,
      uniqueIds,
      CACHE_TTL
    );
  }

  return uniqueIds;
};

/* =========================================================
   RESOLVE FULL CATEGORY CONTEXT
========================================================= */

/**
 * Returns:
 *
 * {
 *   category,
 *   primaryCategoryId,
 *   leafCategoryIds
 * }
 */

export const resolveCategoryContext = async (
  slug
) => {
  const category =
    await resolveCategoryBySlug(
      slug
    );

  if (!category) {
    return null;
  }

  const leafCategoryIds =
    await getLeafCategoryIds(
      category._id
    );

  return {
    category,

    /*
     * The category explicitly requested/resolved.
     */
    primaryCategoryId:
      category._id,

    /*
     * Actual leaf categories used by business
     * search.
     */
    leafCategoryIds,
  };
};

/* =========================================================
   OPTIONAL HELPERS
========================================================= */

export {
  normalizeCategorySlug,
  getDirectChildren,
};