// backend/services/search/fusionScore.js
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
  keywordScore * 0.30 +   // 🔥 MOST IMPORTANT
  ratingScore * 0.20 +
  clickScore * 0.15 +
  distanceScore * 0.15 +
  trendingScore * 0.10 +
  vectorScore * 0.10;

  return score;
}