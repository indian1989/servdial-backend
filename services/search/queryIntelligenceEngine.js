// ================= QUERY INTELLIGENCE ENGINE (V4 CORE) =================

export function classifyQuery(query = "") {
  const q = query.toLowerCase().trim();

  return {
    raw: q,
    tokens: q.split(" ").filter(Boolean),
    isSingleWord: q.split(" ").length === 1,
  };
}

// ================= BUCKET CLASSIFICATION =================
export function assignBucket(business, queryData) {
  const { raw, tokens } = queryData;

  const name = (business.name || "").toLowerCase();
  const tags = (business.tags || []).join(" ").toLowerCase();

  // 🥇 EXACT MATCH
  if (name === raw) return 1;

  // 🥈 PARTIAL NAME MATCH
  if (name.includes(raw)) return 2;

  // 🥉 TOKEN MATCH
  for (let token of tokens) {
    if (name.includes(token)) return 3;
    if (tags.includes(token)) return 3;
  }

  // 🪵 CATEGORY / GENERAL
  return 4;
}