// backend/services/search/fusionScore.js

const computeWeightedRating = (rating = 0, reviewCount = 0) => {
  const C = 3.5;
  const m = 10;

  return (
    (reviewCount / (reviewCount + m)) * rating +
    (m / (reviewCount + m)) * C
  );
};

/* ================= FINAL SCORE ENGINE ================= */
export function computeFinalScore({
  vectorScore = 0,
  keywordScore = 0,
  trendingScore = 0,
  clickScore = 0,
  distanceScore = 0,

  averageRating = 0,
  totalReviews = 0,
}) {
  /* ================= SAFETY NORMALIZATION ================= */
  const safeNum = (v) => (isNaN(v) || v == null ? 0 : v);

  vectorScore = safeNum(vectorScore);
  keywordScore = safeNum(keywordScore);
  trendingScore = safeNum(trendingScore);
  clickScore = safeNum(clickScore);
  distanceScore = safeNum(distanceScore);
  averageRating = safeNum(averageRating);
  totalReviews = safeNum(totalReviews);

  /* ================= RATING ================= */
  let ratingScore = 0;

  if (totalReviews > 0) {
    const weighted = computeWeightedRating(averageRating, totalReviews);

    ratingScore = weighted / 5;

    // FIXED: smoother confidence curve (less aggressive penalty)
    const confidence = Math.min(1, totalReviews / 50);
    ratingScore *= confidence;
  }

  /* ================= TRENDING ================= */
  // FIXED: keep raw signal (don’t destroy resolution)
  const trendingNormalized = trendingScore;

  /* ================= FINAL SCORE ================= */
  let score =
    keywordScore * 0.30 +
    ratingScore * 0.22 +
    clickScore * 0.15 +
    distanceScore * 0.15 +
    trendingNormalized * 0.08 +
    vectorScore * 0.10;

  /* ================= RETURN RAW SCORE (NO CLAMP) ================= */
  return score;
}