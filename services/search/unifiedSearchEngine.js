import { correctQuery } from "../../utils/spellCorrection.js";
import { computeFinalScore } from "./fusionScorer.js";

// these are YOUR existing services (do NOT rewrite)
import vectorSearch from "../vector/vectorSearch.js";
import keywordSearch from "../mongo/keywordSearch.js";
import getRankingSignals from "../ranking/getRankingSignals.js";

export async function unifiedSearch(rawQuery, context = {}) {
  // 1. CLEAN QUERY (already your system)
  const query = correctQuery(rawQuery);

  // 2. PARALLEL SEARCH (IMPORTANT OPTIMIZATION)
  const [vectorResults, keywordResults] = await Promise.all([
    vectorSearch(query, context),
    keywordSearch(query, context)
  ]);

  // 3. NORMALIZE RESULTS INTO MAP (DEDUP CORE)
  const map = new Map();

  function addResult(item, source) {
    const id = item._id.toString();

    if (!map.has(id)) {
      map.set(id, {
        ...item,
        vectorScore: 0,
        keywordScore: 0
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

  vectorResults.forEach(r => addResult(r, "vector"));
  keywordResults.forEach(r => addResult(r, "keyword"));

  // 4. APPLY BUSINESS SIGNALS (YOUR EXISTING SYSTEM)
  const enriched = await Promise.all(
    Array.from(map.values()).map(async (item) => {
      const signals = await getRankingSignals(item._id);

      return {
        ...item,
        trendingScore: signals.trendingScore,
        clickScore: signals.clickScore,
        ratingScore: signals.ratingScore,
        distanceScore: signals.distanceScore
      };
    })
  );

  // 5. FINAL SCORING (FUSION CORE)
  const scored = enriched.map(item => ({
    ...item,
    finalScore: computeFinalScore(item)
  }));

  // 6. SORT FINAL RESULTS
  scored.sort((a, b) => b.finalScore - a.finalScore);

  // 7. RETURN CLEAN OUTPUT
  return {
    query,
    results: scored
  };
}