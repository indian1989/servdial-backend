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
// 🧠 SAFE VALUE HELPER
// =============================
const safeNumber = (val) => {
  return typeof val === "number" && !isNaN(val) ? val : 0;
};

// =============================
// 🧠 NORMALIZE HELPER
// =============================
const normalize = (value, max) => {
  if (!max || max <= 0) return 0;
  return value / max;
};

// =============================
// 📊 GET MAX VALUES
// =============================
const getMaxValues = (items) => {
  let maxViews = 0;
  let maxClicks = 0;
  let maxRating = 0;

  for (const item of items) {
    const views = safeNumber(item.views);
    const clicks = safeNumber(item.clicks);
    const rating = safeNumber(item.averageRating); // ✅ FIXED

    if (views > maxViews) maxViews = views;
    if (clicks > maxClicks) maxClicks = clicks;
    if (rating > maxRating) maxRating = rating;
  }

  return { maxViews, maxClicks, maxRating };
};

// =============================
// 🧠 SCORE CALCULATOR
// =============================
const calculateScore = (item, max, context) => {
  const views = safeNumber(item.views);
  const clicks = safeNumber(item.clicks);
  const rating = safeNumber(item.averageRating); // ✅ FIXED

  const viewsScore = normalize(views, max.maxViews);
  const clicksScore = normalize(clicks, max.maxClicks);
  const ratingScore = normalize(rating, max.maxRating);

  let score =
    viewsScore * WEIGHTS.views +
    clicksScore * WEIGHTS.clicks +
    ratingScore * WEIGHTS.rating;

  // 🔥 FEATURE BOOST
  if (item.isFeatured) {
    score += WEIGHTS.featuredBoost;
  }

  // 🔮 FUTURE: context-based personalization
  // Example:
  // if (context?.userLocation && item.cityId === context.userLocation) {
  //   score += 0.1;
  // }

  return score;
};

// =============================
// 🚀 MAIN FUNCTION
// =============================
export const rankBusinesses = (businesses, context = {}) => {
  if (!Array.isArray(businesses) || businesses.length === 0) {
    return [];
  }

  // 1. Normalize scale
  const max = getMaxValues(businesses);

  // 2. Score
  const scored = businesses.map((b, index) => ({
    ...b,
    _score: calculateScore(b, max, context),
    _index: index, // ✅ for stable sort
  }));

  // 3. Sort (stable)
  scored.sort((a, b) => {
    if (b._score === a._score) {
      return a._index - b._index; // preserve original order
    }
    return b._score - a._score;
  });

  // 4. Clean response
  return scored.map(({ _score, _index, ...rest }) => rest);
};