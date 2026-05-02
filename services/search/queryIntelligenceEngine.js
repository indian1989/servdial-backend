import { normalizeText } from "../utils/normalizeBusiness.js";

/* =========================================================
   🧠 QUERY UNDERSTANDING LAYER
   ========================================================= */
export function classifyQuery(query = "") {
  const raw = normalizeText(query).toLowerCase().trim();

  const tokens = raw
    .split(/\s+/)
    .filter(Boolean)
    .filter(t => t.length > 1);

  return {
    raw,
    tokens,
    isSingleWord: tokens.length === 1,
    length: tokens.length
  };
}

/* =========================================================
   🧠 MATCHING ENGINE (CORE LOGIC)
   ========================================================= */
export function assignBucket(business, queryData) {
  const { raw, tokens } = queryData;

  const name = (business.name || "").toLowerCase();
  const tags = (business.tags || []).join(" ").toLowerCase();
  const category = (business.categoryName || "").toLowerCase();

  // 🥇 EXACT MATCH (HIGHEST PRIORITY)
  if (name === raw) return 1;

  // 🥈 NAME START MATCH (BETTER UX MATCH)
  if (name.startsWith(raw)) return 2;

  // 🥉 PARTIAL NAME MATCH
  if (name.includes(raw)) return 3;

  // 🪵 TOKEN MATCH (NAME + TAGS + CATEGORY)
  for (const token of tokens) {
    if (name.includes(token)) return 4;
    if (tags.includes(token)) return 4;
    if (category.includes(token)) return 4;
  }

  // 🌐 WEAK MATCH (FALLBACK)
  return 5;
}