import BusinessClick from "../models/BusinessClick.js";
import UserPreference from "../models/UserPreference.js";

export const rankBusinesses = async (
  businesses,
  userLocation,
  searchQuery = "",
  intent = {},
  userId = null,
  city = null
) => {
  const query = searchQuery.toLowerCase();
  const queryTokens = query.split(" ").filter(Boolean);

  const businessIds = businesses.map((b) => b._id);

  /* ================= CLICK DATA ================= */
  const clickData = await BusinessClick.aggregate([
    {
      $match: {
        business: { $in: businessIds },
        ...(query && { keyword: query }),
        ...(city && { city }),
      },
    },
    {
      $group: {
        _id: "$business",
        clicks: { $sum: 1 },
      },
    },
  ]);

  const clickMap = {};
  clickData.forEach((c) => {
    clickMap[c._id.toString()] = c.clicks;
  });

  /* ================= USER PREFERENCES ================= */
  let prefMap = {};

  if (userId) {
    const prefs = await UserPreference.find({ user: userId });

    prefs.forEach((p) => {
      prefMap[p.category.toString()] = p.score;
    });
  }

  /* ================= SCORING ================= */
  let scored = businesses.map((biz) => {
    let score = 0;

    const rating = biz.averageRating ?? biz.rating ?? 0;
    const reviewCount = biz.totalReviews ?? biz.reviewCount ?? 0;
    const featured = biz.isFeatured ?? false;
    const featurePriority = biz.featurePriority ?? 0;
    const views = biz.views ?? 0;

    const name = biz.name?.toLowerCase() || "";
    const tags = (biz.tags || []).join(" ").toLowerCase();
    const description = biz.description?.toLowerCase() || "";

    /* ================= EXACT MATCH ================= */
    if (query && name === query) score += 200;

    /* ================= TOKEN MATCH ================= */
    queryTokens.forEach((token) => {
      if (name.includes(token)) score += 40;
      if (tags.includes(token)) score += 25;
      if (description.includes(token)) score += 15;
    });

    /* ================= CATEGORY MATCH ================= */
    if (biz.categoryId || biz.parentCategoryId) {
      score += 30;
    }

    /* ================= RATING ================= */
    score += rating * 30;

    /* ================= REVIEWS ================= */
    score += reviewCount * 1.5;

    /* ================= FEATURED ================= */
    if (featured) {
      score += 80 + featurePriority * 10;
    }

    /* ================= POPULARITY ================= */
    score += Math.log10(views + 1) * 25;

    /* ================= CLICK AI ================= */
    const clicks = clickMap[biz._id.toString()] || 0;
    score += Math.log2(clicks + 1) * 60;

    /* ================= PERSONALIZATION ================= */
    const catId =
      biz.categoryId?.toString() ||
      biz.parentCategoryId?.toString();

    if (catId && prefMap[catId]) {
      score += prefMap[catId] * 8;
    }

    /* ================= DISTANCE ================= */
    if (
      (intent?.nearMe || intent?.locationBased) &&
      userLocation &&
      biz.location?.coordinates
    ) {
      const [lng, lat] = biz.location.coordinates;

      const R = 6371;
      const dLat = ((userLocation.lat - lat) * Math.PI) / 180;
      const dLng = ((userLocation.lng - lng) * Math.PI) / 180;

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat * Math.PI) / 180) *
          Math.cos((userLocation.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      score += Math.max(0, 60 - distance * 6);
    }

    /* ================= FRESHNESS ================= */
    const daysOld =
      (Date.now() - new Date(biz.createdAt)) /
      (1000 * 60 * 60 * 24);

    if (daysOld < 7) score += 25;
    else if (daysOld < 30) score += 12;

    /* ================= INTENT ================= */
    if (intent?.sortBy === "rating") {
      score += rating * 20;
    }

    if (intent?.cheap) score += 15;

    if (intent?.premium && rating > 4.5) {
      score += 30;
    }

    /* ================= PENALTIES ================= */
    if (rating < 2 && reviewCount < 5) {
      score -= 60;
    }

    if ((biz.tags || []).length > 20) {
      score -= 20;
    }

    /* ================= MICRO PERSONALIZATION ================= */
    if (userId && biz.owner?.toString() === userId.toString()) {
      score += 5;
    }

    return {
      ...biz,
      rankScore: score,
      clickScore: clicks,
    };
  });

  /* ================= SORT ================= */
  scored.sort((a, b) => b.rankScore - a.rankScore);

  /* ================= DIVERSITY ================= */
  const diversified = [];
  const categoryCount = {};

  for (let biz of scored) {
    const cat =
      biz.categoryId?.toString() ||
      biz.parentCategoryId?.toString() ||
      "other";

    categoryCount[cat] = categoryCount[cat] || 0;

    if (categoryCount[cat] < 3) {
      diversified.push(biz);
      categoryCount[cat]++;
    }
  }

  if (diversified.length < scored.length) {
    const remaining = scored.filter(
      (b) => !diversified.includes(b)
    );
    diversified.push(...remaining);
  }

  return diversified;
};