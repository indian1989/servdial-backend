// backend/utils/buildSearchQuery.js
// ================= SEMANTIC MAP =================
const semanticMap = {
  plumber: ["pipe", "leak", "tap", "drain", "water leak"],
  electrician: ["light", "wiring", "switch", "fan", "power"],
  "ac repair": ["ac", "cooling", "air conditioner", "not cooling"],
  salon: ["haircut", "hair", "beauty", "spa", "makeup"],
  carpenter: ["wood", "furniture", "door", "table"],
  painter: ["paint", "wall paint", "color"],
  mechanic: ["car repair", "bike repair", "engine"],
};

// ================= EXPAND KEYWORD =================
const expandKeyword = (keyword) => {
  if (!keyword) return [];

  const lower = keyword.toLowerCase();
  let expanded = [lower];

  Object.entries(semanticMap).forEach(([main, synonyms]) => {
    if (
      lower.includes(main) ||
      synonyms.some((s) => lower.includes(s))
    ) {
      expanded.push(main, ...synonyms);
    }
  });

  return [...new Set(expanded)];
};

// ================= SPLIT WORDS =================
const splitWords = (text) => {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
};

// ================= BUILD QUERY =================
export const buildSearchQuery = ({
  city,
  category,
  keyword,
  rating,
  openNow,
}) => {
  const query = {
    status: "approved", // ✅ KEEP
  };

  /* ================= CITY ================= */
  if (city) {
    if (/^[0-9a-fA-F]{24}$/.test(city)) {
  query.city = city;
} else {
  query.cityName = {
    $regex: `^${city.trim().toLowerCase()}`,
    $options: "i",
  };
}
  }

  /* ================= CATEGORY ================= */
  if (category) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(category);

    if (isObjectId) {
      query.$and = query.$and || [];

      query.$and.push({
        $or: [
          { categoryId: category },
          { secondaryCategories: category },
          { parentCategoryId: category },
        ],
      });
    } else {
      query.categorySlug = {
        $regex: `^${category.trim()}`,
        $options: "i",
      };
    }
  }

  /* ================= KEYWORD (UPGRADED SEMANTIC) ================= */
  if (keyword) {
    const safeKeyword = keyword.trim();
    const expanded = expandKeyword(safeKeyword);
    const split = splitWords(safeKeyword);

    query.$and = query.$and || [];

    // 🔥 1. FULL PHRASE MATCH (highest priority)
    const phraseMatch = {
      $or: [
        { name: { $regex: safeKeyword, $options: "i" } },
        { description: { $regex: safeKeyword, $options: "i" } },
      ],
    };

    // 🔥 2. EXPANDED SEMANTIC MATCH
    const semanticMatch = {
      $or: expanded.flatMap((word) => [
        { name: { $regex: word, $options: "i" } },
        { description: { $regex: word, $options: "i" } },
        { tags: { $regex: word, $options: "i" } },
        { keywords: { $regex: word, $options: "i" } },
      ]),
    };

    // 🔥 3. SPLIT WORD MATCH (important for long queries)
    const splitMatch = {
      $and: split.map((word) => ({
        $or: [
          { name: { $regex: word, $options: "i" } },
          { tags: { $regex: word, $options: "i" } },
        ],
      })),
    };

    query.$and.push({
      $or: [phraseMatch, semanticMatch, splitMatch],
    });
  }

  /* ================= RATING ================= */
  if (rating) {
    query.averageRating = {
      $gte: Number(rating),
    };
  }

  /* ================= OPEN NOW ================= */
  if (openNow === "true") {
    const now = new Date();
    const day = now
      .toLocaleString("en-US", { weekday: "long" })
      .toLowerCase();

    const time = now.toTimeString().slice(0, 5);

    query[`businessHours.${day}.open`] = { $lte: time };
    query[`businessHours.${day}.close`] = { $gte: time };
  }

  return query;
};