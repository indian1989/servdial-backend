const clamp01 = (n) => Math.max(0, Math.min(1, n || 0));

const normalize = (b) => ({
  rating: clamp01((b.averageRating || 0) / 5),
  views: clamp01(
  Math.log10(Number(b.views || 0) + 1) / 5
),
  clicks: clamp01(b.clickScore || 0),
  distance: clamp01(b.distanceScore ?? 1),
  trending: clamp01(b.trendingScore || 0),
  vector: clamp01(b.vectorScore || 0),
  feature: b.isFeatured ? 1 : 0
});

const computeScore = (s, context) => {
  const intent = context?.sortBy ?? context?.intent ?? "default";
  const isNearby = !!context?.intent?.isNearMe;

  const weights = {
    rating: intent === "rating" ? 0.35 : 0.25,
    views: 0.10,
    clicks: 0.15,
    distance: isNearby ? 0.25 : 0.10,
    trending: 0.15,
    vector: 0.10,
    feature: 0.10
  };

  return (
    s.rating * weights.rating +
    s.views * weights.views +
    s.clicks * weights.clicks +
    s.distance * weights.distance +
    s.trending * weights.trending +
    s.vector * weights.vector +
    s.feature * weights.feature
  );
};

export const rankBusinesses = (businesses = [], context = {}) => {
  if (!Array.isArray(businesses)) return [];

  const enriched = businesses
    .filter(Boolean)
    .map((b) => {
      try {
        const signals = normalize(b);
        const finalScore = computeScore(signals, context);

        return {
          ...b,
          finalScore: Number(finalScore || 0),
        };
      } catch (err) {
        console.error("🔥 RANK ERROR:", err.message);
        return {
          ...b,
          finalScore: 0,
        };
      }
    });

  return enriched.sort((a, b) => {
    const diff = (b.finalScore || 0) - (a.finalScore || 0);
    if (diff !== 0) return diff;

    return (b.views || 0) - (a.views || 0);
  });
};