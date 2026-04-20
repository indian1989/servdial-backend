// backend/utils/buildSearchQuery.js
import mongoose from "mongoose";
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
      expanded.push(main, ...synonyms.slice(0, 3));
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

// ================= ESCAPE REGEX (ADD HERE) =================
const escapeRegex = (text) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");


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
  if (!mongoose.Types.ObjectId.isValid(city)) {
    throw new Error("Invalid cityId: must be ObjectId");
  }

  query.cityId = new mongoose.Types.ObjectId(city);
}

  /* ================= CATEGORY ================= */
  if (category) {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(category);

if (isObjectId) {
  const catId = new mongoose.Types.ObjectId(category);

  query.$and = query.$and || [];

  query.$and.push({
    $or: [
      { categoryId: catId },
      { parentCategoryId: catId },
    ],
  });
}
  }

  /* ================= KEYWORD (UPGRADED SEMANTIC) ================= */
  if (keyword) {
    const safeKeyword = keyword.trim().toLowerCase();
const safeRegex = escapeRegex(safeKeyword);
const expanded = expandKeyword(safeKeyword);
const split = splitWords(safeKeyword);

query.$and = query.$and || [];

query.$and.push({
  $or: [
    // ✅ primary (light regex)
    { name: { $regex: safeRegex, $options: "i" } },

    // ✅ fast semantic (INDEX FRIENDLY)
    { tags: { $in: expanded } },
    { keywords: { $in: expanded } },

    // ✅ fallback split (limited)
    ...split.slice(0, 3).map((word) => ({
  name: { $regex: escapeRegex(word), $options: "i" },
})),
  ],
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