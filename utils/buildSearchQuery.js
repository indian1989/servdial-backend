// backend/utils/buildSearchQuery.js
import mongoose from "mongoose";

/* ================= SEMANTIC MAP ================= */
const semanticMap = {
  plumber: ["pipe", "leak", "tap", "drain", "water leak"],
  electrician: ["light", "wiring", "switch", "fan", "power"],
  "ac repair": ["ac", "cooling", "air conditioner", "not cooling"],
  salon: ["haircut", "hair", "beauty", "spa", "makeup"],
  carpenter: ["wood", "furniture", "door", "table"],
  painter: ["paint", "wall paint", "color"],
  mechanic: ["car repair", "bike repair", "engine"],
};

/* ================= NORMALIZE ================= */
const normalize = (str = "") =>
  str.toLowerCase().trim().replace(/\s+/g, " ");

/* ================= EXPAND KEYWORD ================= */
const expandKeyword = (keyword = "") => {
  const lower = normalize(keyword);
  if (!lower) return [];

  let expanded = [lower];

  for (const [main, synonyms] of Object.entries(semanticMap)) {
    const normMain = normalize(main);

    if (
      lower.includes(normMain) ||
      synonyms.some((s) => lower.includes(normalize(s)))
    ) {
      expanded.push(normMain, ...synonyms.slice(0, 3).map(normalize));
    }
  }

  return [...new Set(expanded)];
};

/* ================= SPLIT WORDS ================= */
const splitWords = (text = "") =>
  normalize(text)
    .split(" ")
    .filter((w) => w.length > 2);

/* ================= ESCAPE REGEX ================= */
const escapeRegex = (text = "") =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ================= BUILD QUERY ================= */
export const buildSearchQuery = ({
  city,
  category,
  keyword,
  rating,
  openNow,
}) => {
  const query = {
    status: "approved",
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
    const isObjectId = mongoose.Types.ObjectId.isValid(category);

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

  /* ================= KEYWORD ================= */
  if (keyword) {
    const safeKeyword = normalize(keyword);
    const safeRegex = escapeRegex(safeKeyword);

    const expanded = expandKeyword(safeKeyword);
    const split = splitWords(safeKeyword);

    query.$and = query.$and || [];

    query.$and.push({
      $or: [
        { name: { $regex: safeRegex, $options: "i" } },
        { tags: { $in: expanded } },
        ...(Array.isArray(expanded)
          ? [{ keywords: { $in: expanded } }]
          : []),
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

  /* ================= OPEN NOW (SAFE VERSION) ================= */
  if (openNow === "true") {
    const now = new Date();
    const utcDay = now.getUTCDay();

    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    const day = days[utcDay];
    const time = now.toISOString().slice(11, 16);

    query[`businessHours.${day}.open`] = { $lte: time };
    query[`businessHours.${day}.close`] = { $gte: time };
  }

  return query;
};