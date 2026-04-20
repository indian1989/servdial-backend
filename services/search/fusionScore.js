const computeWeightedRating = (rating = 0, reviewCount = 0) => {
  const C = 3.5; // global avg
  const m = 10;  // min reviews threshold

  return (
    (reviewCount / (reviewCount + m)) * rating +
    (m / (reviewCount + m)) * C
  );
};

export function computeFinalScore({
  vectorScore = 0,
  keywordScore = 0,
  trendingScore = 0,
  clickScore = 0,
  distanceScore = 0,

  // 🔥 RAW INPUTS ONLY
  averageRating = 0,
  totalReviews = 0
}) {
  /* ================= RATING (ANTI-MANIPULATION) ================= */

  let finalRatingScore = 0;

  if (totalReviews > 0) {
    const weighted = computeWeightedRating(averageRating, totalReviews);

    // normalize (0–1)
    finalRatingScore = weighted / 5;

    // 🔒 confidence damping
    const confidence = Math.min(1, totalReviews / 20);
    finalRatingScore *= confidence;
  }

  /* ================= FINAL SCORE ================= */

  const score =
    keywordScore * 0.30 +
    finalRatingScore * 0.20 +
    clickScore * 0.15 +
    distanceScore * 0.15 +
    trendingScore * 0.10 +
    vectorScore * 0.10;

  return score;
}