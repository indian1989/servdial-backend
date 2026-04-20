// backend/services/search/unifiedSearchEngine.js
import { correctQuery } from "../../utils/spellCorrection.js";
import vectorSearch from "../vector/vectorSearch.js";
import keywordSearch from "../mongo/keywordSearch.js";
import { unifiedRanking } from "../ranking/unifiedRankingEngine.js";

export async function unifiedSearch(rawQuery, context = {}) {
  // ================= 1. CLEAN QUERY =================
  const query = correctQuery(rawQuery);

  // ================= 2. PARALLEL SEARCH =================
  const [vectorResults, keywordResults] = await Promise.all([
    vectorSearch(query, context),
    keywordSearch(query, context),
  ]);

  // ================= 3. MERGE IDS =================
  const scoreMap = new Map();

function addResult(item, source) {
  const id = item._id.toString();

  if (!scoreMap.has(id)) {
    scoreMap.set(id, {
      _id: item._id,
      vectorScore: 0,
      keywordScore: 0,
    });
  }

  const existing = scoreMap.get(id);

  if (source === "vector") {
    existing.vectorScore = item.score || 0;
  }

  if (source === "keyword") {
    existing.keywordScore = item.score || 0;
  }
}

vectorResults.forEach((r) => addResult(r, "vector"));
keywordResults.forEach((r) => addResult(r, "keyword"));

const MAX_FETCH = 100;

const candidates = Array.from(scoreMap.values()).slice(0, MAX_FETCH);

  // ================= 4. DELEGATE TO RANKING ENGINE =================
const ranked = await unifiedRanking({
  q: query,
  candidates,
  cityId: context.cityId,
  lat: context.lat,
  lng: context.lng,
  category: context.category,
  limit: context.limit || 20,
});

return {
  query,
  results: ranked,
};
}