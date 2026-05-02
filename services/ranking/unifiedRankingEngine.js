//
// Unified Ranking Engine
// PURE: no DB access, no slug logic, no side-effects
//

// =============================
// ⚙️ WEIGHTS (TUNE LATER)
// =============================
const WEIGHTS = {
  views: 0.3,
  clicks: 0.4,
  rating: 0.3,

  // boost flags (optional future)
  featuredBoost: 50,
};


// =============================
// 🧠 NORMALIZE HELPER
// Avoid scale domination (e.g., views >> rating)
// =============================
const normalize = (value, max) => {
  if (!max || max === 0) return 0;
  return value / max;
};


// =============================
// 📊 GET MAX VALUES (for normalization)
// =============================
const getMaxValues = (items) => {
  let maxViews = 0;
  let maxClicks = 0;
  let maxRating = 0;

  for (const item of items) {
    if (item.views > maxViews) maxViews = item.views;
    if (item.clicks > maxClicks) maxClicks = item.clicks;
    if (item.rating > maxRating) maxRating = item.rating;
  }

  return { maxViews, maxClicks, maxRating };
};


// =============================
// 🧠 SCORE CALCULATOR
// =============================
const calculateScore = (item, max) => {
  const viewsScore = normalize(item.views || 0, max.maxViews);
  const clicksScore = normalize(item.clicks || 0, max.maxClicks);
  const ratingScore = normalize(item.rating || 0, max.maxRating);

  let score =
    viewsScore * WEIGHTS.views +
    clicksScore * WEIGHTS.clicks +
    ratingScore * WEIGHTS.rating;

  // 🔥 future: featured boost
  if (item.isFeatured) {
    score += WEIGHTS.featuredBoost;
  }

  return score;
};


// =============================
// 🚀 MAIN FUNCTION
// =============================
export const rankBusinesses = (businesses, context = {}) => {
  if (!Array.isArray(businesses) || businesses.length === 0) {
    return [];
  }

  // =============================
  // 1. Get max values
  // =============================
  const max = getMaxValues(businesses);

  // =============================
  // 2. Score each business
  // =============================
  const scored = businesses.map((b) => ({
    ...b,
    _score: calculateScore(b, max),
  }));

  // =============================
  // 3. Sort DESC
  // =============================
  scored.sort((a, b) => b._score - a._score);

  // =============================
  // 4. Remove internal score
  // =============================
  return scored.map(({ _score, ...rest }) => rest);
};

export const unifiedRanking = (params) => {
  return unifiedRankingEngine(params);
};