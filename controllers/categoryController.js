import mongoose from "mongoose";

import Category from "../models/Category.js";
import slugify from "../utils/slugify.js";
import memoryCache from "../utils/memoryCache.js";

import {
  invalidateCategoryCache,
  resolveCategoryBySlug,
  normalizeCategorySlug,
  getDirectChildren,
} from "../services/resolver/categoryResolver.js";
import { pingSearchEngines } from "../services/seo/pingSearchEngines.js";
import { generateCategoryKeywords } from "../utils/categoryKeywords.js";

/* =========================================================
   CATEGORY VALIDATION HELPERS
========================================================= */

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);


/* =========================================================
   VALIDATE CATEGORY NAME + SLUG
========================================================= */

const validateCategoryName = (name) => {

  if (
    typeof name !== "string"
  ) {
    throw new Error(
      "Category name is required"
    );
  }


  const cleanName =
    name
      .trim()
      .replace(/\s+/g, " ");


  if (!cleanName) {
    throw new Error(
      "Category name is required"
    );
  }


  const slug =
    slugify(cleanName);


  if (!slug) {
    throw new Error(
      "Category slug could not be generated"
    );
  }


  return {
    name: cleanName,
    slug,
  };

};


/* =========================================================
   VALIDATE PARENT CATEGORY + CIRCULAR TREE
========================================================= */

const validateParentCategory = async ({
  categoryId = null,
  parentCategory = null,
}) => {

  /* =======================================================
     ROOT CATEGORY
  ======================================================= */

  if (
    parentCategory === null ||
    parentCategory === undefined ||
    parentCategory === ""
  ) {
    return null;
  }


  /* =======================================================
     OBJECT ID VALIDATION
  ======================================================= */

  if (
    !isValidObjectId(
      parentCategory
    )
  ) {
    throw new Error(
      "Invalid parent category"
    );
  }


  const parentId =
    String(parentCategory);


  /* =======================================================
     SELF-PARENT PROTECTION
  ======================================================= */

  if (
    categoryId &&
    parentId ===
      String(categoryId)
  ) {
    throw new Error(
      "Category cannot be its own parent"
    );
  }


  /* =======================================================
     PARENT EXISTENCE
  ======================================================= */

  const parent =
  await Category.findById(
    parentCategory
  )
  .select(
    "_id parentCategory status level"
  )
  .lean();


if (!parent) {
  throw new Error(
    "Parent category not found"
  );
}


/* =======================================================
   PARENT MUST BE ROOT CATEGORY
======================================================= */

if (
  Number(parent.level) !== 0
) {
  throw new Error(
    "Sub category cannot be used as a parent category"
  );
}


  /* =======================================================
     OPTIONAL SAFETY:
     PARENT MUST BE ACTIVE
  ======================================================= */

  if (
    parent.status !==
    "active"
  ) {
    throw new Error(
      "Parent category must be active"
    );
  }


  /* =======================================================
     CIRCULAR REFERENCE PROTECTION
  ======================================================= */

  if (!categoryId) {
    return parentCategory;
  }


  const visited =
    new Set();


  let currentId =
    parent._id;


  while (
    currentId
  ) {

    const currentKey =
      String(currentId);


    /* -----------------------------------------------
       EXISTING BAD CYCLE
    ----------------------------------------------- */

    if (
      visited.has(
        currentKey
      )
    ) {
      throw new Error(
        "Circular category hierarchy detected"
      );
    }


    visited.add(
      currentKey
    );


    /* -----------------------------------------------
       TARGET CATEGORY APPEARS IN PARENT CHAIN
    ----------------------------------------------- */

    if (
      currentKey ===
      String(categoryId)
    ) {
      throw new Error(
        "Circular category hierarchy detected"
      );
    }


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


  return parentCategory;

};

/* ================= BUILD TREE ================= */
const buildCategoryTree = (categories) => {
  const map = {};
  const roots = [];

  categories.forEach((cat) => {
    map[cat._id] = {
      ...cat,
      children: [],
    };
  });

  categories.forEach((cat) => {
    if (cat.parentCategory) {
      map[cat.parentCategory]?.children.push(map[cat._id]);
    } else {
      roots.push(map[cat._id]);
    }
  });

  return roots;
};

/* ================= GET ALL ================= */
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({
  status: "active",
})
  .sort({
    order: 1,
    name: 1,
  })
  .lean();

    res.json({
      success: true,
      data: categories,
    });
  } catch (err) {
    console.error("getAllCategories:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

/* ================= GET TREE ================= */
export const getCategoryTree = async (req, res) => {
  try {
    const cacheKey = "categories:tree";

    const cached = memoryCache.get(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        data: cached,
      });
    }

    const categories = await Category.find({
  status: "active",
})
  .sort({
    level: 1,
    order: 1,
    name: 1,
  })
  .lean();

    const tree = buildCategoryTree(categories);

    memoryCache.set(cacheKey, tree, 60 * 60 * 6);

    res.json({
      success: true,
      data: tree,
    });
  } catch (err) {
    console.error("getCategoryTree:", err);

    res.status(500).json({
      success: false,
      message: "Failed to build category tree",
    });
  }
};

/* ================= GET BY SLUG ================= */

export const getCategoryBySlug = async (req, res) => {
  try {

    const rawValue =
      req.params.slug;

    const normalizedSlug =
      normalizeCategorySlug(rawValue);


    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!normalizedSlug) {

      return res.status(400).json({
        success: false,
        message: "Category slug is required",
      });

    }


    /* =====================================================
       SSOT CATEGORY RESOLUTION
       
       Supports:
       - current slug
       - slugHistory
    ===================================================== */

    const category =
      await resolveCategoryBySlug(
        normalizedSlug
      );


    /* =====================================================
       NOT FOUND
    ===================================================== */

    if (!category) {

      return res.status(404).json({
        success: false,
        message: "Category not found",
      });

    }


    /* =====================================================
       OLD SLUG DETECTION
    ===================================================== */

    const canonicalSlug =
      normalizeCategorySlug(
        category.slug
      );

    const isOldSlug =
      normalizedSlug !==
      canonicalSlug;


    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.json({

      success: true,

      data:
        category,

      redirect:
        isOldSlug,

      canonicalSlug:
        canonicalSlug,

    });

  } catch (err) {

    console.error(
      "getCategoryBySlug error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });

  }
};

/* ================= GET CHILDREN ================= */

export const getCategoryWithChildren = async (req, res) => {
  try {

    const normalizedSlug =
      normalizeCategorySlug(
        req.params.slug
      );


    if (!normalizedSlug) {
      return res.status(400).json({
        success: false,
        message: "Category slug is required",
      });
    }


    const parent =
      await resolveCategoryBySlug(
        normalizedSlug
      );


    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }


    const children =
      await getDirectChildren(
        parent._id
      );


    const canonicalSlug =
      normalizeCategorySlug(
        parent.slug
      );


    const isOldSlug =
      normalizedSlug !==
      canonicalSlug;


    return res.json({

      success: true,

      data: {
        parent,
        children,
      },

      redirect:
        isOldSlug,

      canonicalSlug:
        canonicalSlug,

    });

  } catch (err) {

    console.error(
      "getCategoryWithChildren:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch children",
    });

  }
};

/* ================= TRENDING ================= */
export const getTrendingCategories = async (req, res) => {
  try {
    const trending = await Category.find({
      status: "active",
      isTrending: true,
    })
      .limit(20)
      .lean();

    res.json({
      success: true,
      data: trending,
    });
  } catch (err) {
    console.error("getTrendingCategories:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch trending categories",
    });
  }
};

/* ================= CREATE ================= */
export const createCategory = async (req, res) => {
  try {
    const {
  name,
  parentCategory = null,
  order = 0,
  description = "",
  uiType = "service",
  features = [],
} = req.body;


/* =====================================================
   VALIDATE NAME + SLUG
===================================================== */

let validatedName;
let slug;

try {

  const validated =
    validateCategoryName(
      name
    );

  validatedName =
    validated.name;

  slug =
    validated.slug;

} catch (err) {

  return res.status(400).json({
    success: false,
    message: err.message,
  });

}


/* =====================================================
   VALIDATE PARENT
===================================================== */

let validatedParentCategory;

try {

  validatedParentCategory =
    await validateParentCategory({
      parentCategory,
    });

} catch (err) {

  return res.status(400).json({
    success: false,
    message: err.message,
  });

}

    const exists = await Category.findOne({
  $or: [
    { slug },
    { "slugHistory.slug": slug },
  ],
});

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    const level =
  validatedParentCategory
    ? 1
    : 0;

    const finalFeatures = [...new Set([...(features || []), "offers"])];

const keywords = generateCategoryKeywords({
  name: validatedName,
  slug,
});

const category = await Category.create({
  name: validatedName,
  slug,
  parentCategory: validatedParentCategory,
  level,
  order,
  description,
  uiType,
  features: finalFeatures,
  keywords,
});

    await invalidateCategoryCache({
  categoryId: category._id,
  slug: category.slug,
  parentCategoryId: category.parentCategory,
});

    await pingSearchEngines();

    res.json({
      success: true,
      data: category,
    });
  } catch (err) {
    console.error("createCategory:", err);

    res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

/* ================= UPDATE ================= */
export const updateCategory = async (req, res) => {
  try {

    if (
  !isValidObjectId(
    req.params.id
  )
) {
  return res.status(400).json({
    success: false,
    message: "Invalid category id",
  });
}
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

      const oldSlug =
  category.slug;

const oldParentCategory =
  category.parentCategory;
  

    const {
      name,
      order,
      status,
      description,
      parentCategory,
      isTrending,
      uiType,
      features,
    } = req.body;

    /* =====================================================
       CATEGORY NAME + SLUG
    ===================================================== */

if (
  name !== undefined &&
  String(name).trim() !==
    category.name
) {

  let validated;

  try {

    validated =
      validateCategoryName(
        name
      );

  } catch (err) {

    return res.status(400).json({
      success: false,
      message: err.message,
    });

  }


  const cleanName =
    validated.name;

  const newSlug =
    validated.slug;


  const slugExists =
  await Category.findOne({

    $or: [
      {
        slug: newSlug,
      },
      {
        "slugHistory.slug":
          newSlug,
      },
    ],

    _id: {
      $ne:
        category._id,
    },

  });

  if (slugExists) {

    return res.status(400).json({
      success: false,
      message:
        "Slug already exists",
    });

  }


  category.name =
    cleanName;

  category.slug =
    newSlug;

}

    /* =====================================================
       BASIC FIELDS
    ===================================================== */

    if (order !== undefined) {
      category.order = order;
    }

    if (status !== undefined) {
      category.status = status;
    }

    if (description !== undefined) {
      category.description = description;
    }

    /* =====================================================
       PARENT CATEGORY + LEVEL
    ===================================================== */

    if (
  parentCategory !==
  undefined
) {

  let validatedParentCategory;

  try {

    validatedParentCategory =
      await validateParentCategory({

        categoryId:
          category._id,

        parentCategory:
          parentCategory || null,

      });

  } catch (err) {

    return res.status(400).json({
      success: false,
      message:
        err.message,
    });

  }


  category.parentCategory =
    validatedParentCategory;

  category.level =
    validatedParentCategory
      ? 1
      : 0;

}


    /* =====================================================
       UI TYPE
    ===================================================== */

    if (uiType !== undefined) {
      category.uiType = uiType;
    }

    /* =====================================================
       FEATURES
       Always preserve existing features.
       "offers" remains mandatory.
    ===================================================== */

    category.features = [
      ...new Set([
        ...(features ?? category.features ?? []),
        "offers",
      ]),
    ];

    /* =====================================================
       TRENDING
    ===================================================== */

    if (isTrending !== undefined) {
      category.isTrending = isTrending;
    }

    /* =====================================================
       SAVE

       IMPORTANT:
       category.save() triggers Category.js
       pre-save middleware.

       If slug changed:
       old slug → slugHistory[]
    ===================================================== */

    /* =====================================================
   AUTO GENERATE KEYWORDS
===================================================== */

category.keywords = generateCategoryKeywords({
  name: category.name,
  slug: category.slug,
});

    await category.save();

    /* =====================================================
       CACHE RESET
    ===================================================== */

   await invalidateCategoryCache({

  categoryId:
    category._id,

  slug:
    category.slug,

  oldSlug,

  parentCategoryId:
    category.parentCategory,

  oldParentCategoryId:
    oldParentCategory,

});


    /* =====================================================
       SEARCH ENGINE PING
    ===================================================== */

    await pingSearchEngines();

    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.json({
      success: true,
      data: category,
      canonicalSlug: category.slug,
      slugHistory: category.slugHistory || [],
    });

  } catch (err) {
    console.error(
      "updateCategory:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update category",
    });
  }
};


/* ================= DELETE ================= */

export const deleteCategory = async (req, res) => {
  try {

    if (
  !isValidObjectId(
    req.params.id
  )
) {
  return res.status(400).json({
    success: false,
    message: "Invalid category id",
  });
}

    /* =====================================================
       1. CHECK CHILD CATEGORIES
    ===================================================== */

    const hasChildren =
      await Category.exists({
        parentCategory:
          req.params.id,
      });


    if (hasChildren) {

      return res.status(400).json({

        success: false,

        message:
          "Has children categories",

      });

    }


    /* =====================================================
       2. LOAD CATEGORY BEFORE DELETE
       
       Needed for:
       - old slug cache invalidation
       - parent cache invalidation
       - category cache invalidation
    ===================================================== */

    const category =
      await Category.findById(
        req.params.id
      );


    if (!category) {

      return res.status(404).json({

        success: false,

        message:
          "Category not found",

      });

    }


    /* =====================================================
       3. DELETE CATEGORY
    ===================================================== */

    await Category.findByIdAndDelete(
      req.params.id
    );


    /* =====================================================
       4. INVALIDATE CATEGORY CACHE
    ===================================================== */

    await invalidateCategoryCache({
  categoryId: category._id,
  slug: category.slug,
  parentCategoryId: category.parentCategory,
});


    /* =====================================================
       5. PING SEARCH ENGINES
    ===================================================== */

    await pingSearchEngines();


    /* =====================================================
       6. RESPONSE
    ===================================================== */

    return res.json({

      success: true,

    });

  } catch (err) {

    console.error(
      "deleteCategory:",
      err
    );


    return res.status(500).json({

      success: false,

      message:
        "Failed to delete category",

    });

  }
};