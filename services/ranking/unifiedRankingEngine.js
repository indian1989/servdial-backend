// backend/services/ranking/unifiedRankingEngine.js

//
// Unified Ranking Engine
// PURE:
// - No DB access
// - No slug logic
// - No API logic
// - No side effects
//
// Responsibility:
// - Calculate ranking score
// - Normalize ranking signals
// - Sort businesses
// - Preserve stable order
//

// =========================================================
// ⚙️ RANKING WEIGHTS
// =========================================================

const WEIGHTS = {
  views: 0.25,
  clicks: 0.35,
  rating: 0.25,
  priority: 0.15,

  // Featured is an additional boost,
  // not part of the 100% weighted score.
  featuredBoost: 0.5,
};

// =========================================================
// 🧠 SAFE NUMBER
// =========================================================

const safeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

// =========================================================
// 🧠 NORMALIZE VALUE
// =========================================================

const normalize = (value, max) => {
  if (!max || max <= 0) {
    return 0;
  }

  return Math.min(
    Math.max(value / max, 0),
    1
  );
};

// =========================================================
// 🧠 PRIORITY NORMALIZE
// =========================================================

const normalizePriority = (value) => {
  const priority = safeNumber(value);

  return Math.min(
    Math.max(priority / 100, 0),
    1
  );
};

// =========================================================
// 📊 GET MAXIMUM SIGNAL VALUES
// =========================================================

const getMaxValues = (items) => {
  let maxViews = 0;
  let maxClicks = 0;
  let maxRating = 0;

  for (const item of items) {
    const views = safeNumber(item.views);
    const clicks = safeNumber(item.clicks);
    const rating = safeNumber(item.averageRating);

    if (views > maxViews) {
      maxViews = views;
    }

    if (clicks > maxClicks) {
      maxClicks = clicks;
    }

    if (rating > maxRating) {
      maxRating = rating;
    }
  }

  return {
    maxViews,
    maxClicks,
    maxRating,
  };
};

// =========================================================
// 🧮 CALCULATE BUSINESS SCORE
// =========================================================

const calculateScore = (item, max, context = {}) => {
  const views = safeNumber(item.views);
  const clicks = safeNumber(item.clicks);
  const rating = safeNumber(item.averageRating);
  const priority = safeNumber(item.priorityScore);

  // -------------------------------------------------------
  // NORMALIZED SIGNALS
  // -------------------------------------------------------

  const viewsScore = normalize(
    views,
    max.maxViews
  );

  const clicksScore = normalize(
    clicks,
    max.maxClicks
  );

  const ratingScore = normalize(
    rating,
    max.maxRating
  );

  const priorityScore = normalizePriority(
    priority
  );

  // -------------------------------------------------------
  // BASE SCORE
  // -------------------------------------------------------

  let score =
    viewsScore * WEIGHTS.views +
    clicksScore * WEIGHTS.clicks +
    ratingScore * WEIGHTS.rating +
    priorityScore * WEIGHTS.priority;

  // -------------------------------------------------------
  // ⭐ FEATURED BOOST
  // -------------------------------------------------------

  if (item.isFeatured === true) {
    score += WEIGHTS.featuredBoost;
  }

  // -------------------------------------------------------
  // 🔮 FUTURE CONTEXT
  // -------------------------------------------------------
  //
  // Context intentionally does not affect ranking yet.
  //
  // Future examples:
  //
  // - user location
  // - city match
  // - category preference
  // - search intent
  // - distance
  // - personalization
  //
  // These should be added here later,
  // without adding database access.
  //

  void context;

  return score;
};

// =========================================================
// 🚀 MAIN RANKING FUNCTION
// =========================================================

export const rankBusinesses = (
  businesses,
  context = {}
) => {
  // -------------------------------------------------------
  // SAFETY
  // -------------------------------------------------------

  if (
    !Array.isArray(businesses) ||
    businesses.length === 0
  ) {
    return [];
  }

  // -------------------------------------------------------
  // 1. GET NORMALIZATION VALUES
  // -------------------------------------------------------

  const max = getMaxValues(
    businesses
  );

  // -------------------------------------------------------
  // 2. CALCULATE SCORES
  // -------------------------------------------------------

  const scored = businesses.map(
    (business, index) => ({
      ...business,

      _score: calculateScore(
        business,
        max,
        context
      ),

      // Used for stable sorting.
      _index: index,
    })
  );

  // -------------------------------------------------------
  // 3. SORT BY SCORE
  // -------------------------------------------------------

  scored.sort((a, b) => {
    // Higher score first.
    if (b._score !== a._score) {
      return b._score - a._score;
    }

    // Same score:
    // preserve original database/search order.
    return a._index - b._index;
  });

  // -------------------------------------------------------
  // 4. REMOVE INTERNAL FIELDS
  // -------------------------------------------------------

  return scored.map(
    ({ _score, _index, ...business }) =>
      business
  );
};