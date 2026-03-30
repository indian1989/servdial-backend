import { correctQuery } from "../../utils/spellCorrection.js";
import { computeFinalScore } from "./fusionScorer.js";

import vectorSearch from "../vector/vectorSearch.js";
import keywordSearch from "../mongo/keywordSearch.js";
import getRankingSignals from "../ranking/getRankingSignals.js";

// 🔥 ADD THIS
import Business from "../../models/Business.js";

export async function unifiedSearch(rawQuery, context = {}) {
  // ================= 1. CLEAN QUERY =================
  const query = correctQuery(rawQuery);

  // ================= 2. PARALLEL SEARCH =================
  const [vectorResults, keywordResults] = await Promise.all([
    vectorSearch(query, context),
    keywordSearch(query, context),
  ]);

  // ================= 3. MERGE IDS =================
  const map = new Map();

  function addResult(item, source) {
    const id = item._id.toString();

    if (!map.has(id)) {
      map.set(id, {
        _id: item._id,
        vectorScore: 0,
        keywordScore: 0,
      });
    }

    const existing = map.get(id);

    if (source === "vector") {
      existing.vectorScore = item.score || 0;
    }

    if (source === "keyword") {
      existing.keywordScore = item.score || 0;
    }
  }

  vectorResults.forEach((r) => addResult(r, "vector"));
  keywordResults.forEach((r) => addResult(r, "keyword"));

  const ids = Array.from(map.keys());

  // ================= 4. 🔥 FETCH FULL BUSINESS DATA =================
  const businesses = await Business.find({
    _id: { $in: ids },
    status: "approved",
  })
    .select(`
      name slug city category
      phone images logo
      isVerified isFeatured featurePriority
      averageRating totalReviews views createdAt location
    `)
    .lean();

  // ================= 5. MERGE FULL DATA =================
  const enriched = await Promise.all(
    businesses.map(async (b) => {
      const base = map.get(b._id.toString());

      const signals = await getRankingSignals(b._id);

      return {
        ...b,

        // 🔥 KEEP SCORES
        vectorScore: base?.vectorScore || 0,
        keywordScore: base?.keywordScore || 0,

        // 🔥 SIGNALS
        trendingScore: signals.trendingScore,
        clickScore: signals.clickScore,
        ratingScore: signals.ratingScore,
        distanceScore: signals.distanceScore,
      };
    })
  );

  // ================= 6. FINAL SCORE =================
  const scored = enriched.map((item) => ({
    ...item,
    finalScore: computeFinalScore(item),
  }));

  // ================= 7. SORT =================
  scored.sort((a, b) => b.finalScore - a.finalScore);

  // ================= 8. RETURN =================
  return {
    query,
    results: scored,
  };
}