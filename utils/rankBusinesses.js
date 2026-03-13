export const rankBusinesses = (businesses, userLocation) => {

  return businesses.map((biz) => {

    let score = 0;

    // ⭐ Rating score
    score += (biz.rating || 0) * 40;

    // 📝 Review score
    score += (biz.reviewCount || 0) * 2;

    // 💰 Featured boost
    if (biz.featured) {
      score += 50;
    }

    // 📍 Distance score
    if (userLocation && biz.location?.coordinates) {

      const [lng, lat] = biz.location.coordinates;

      const distance =
        Math.sqrt(
          Math.pow(userLocation.lat - lat, 2) +
          Math.pow(userLocation.lng - lng, 2)
        );

      const proximityScore = Math.max(0, 50 - distance * 10);

      score += proximityScore;

    }

    // 🆕 Freshness boost
    const daysOld =
      (Date.now() - new Date(biz.createdAt)) /
      (1000 * 60 * 60 * 24);

    if (daysOld < 30) {
      score += 10;
    }

    return {
      ...biz._doc,
      rankScore: score
    };

  }).sort((a, b) => b.rankScore - a.rankScore);

};