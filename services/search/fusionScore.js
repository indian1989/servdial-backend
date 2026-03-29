export function computeFinalScore({
  vectorScore = 0,
  keywordScore = 0,
  trendingScore = 0,
  clickScore = 0,
  ratingScore = 0,
  distanceScore = 0
}) {
  // weighted fusion model (production-safe default)
  const score =
    vectorScore * 0.40 +
    keywordScore * 0.25 +
    ratingScore * 0.15 +
    clickScore * 0.10 +
    trendingScore * 0.07 +
    distanceScore * 0.03;

  return score;
}