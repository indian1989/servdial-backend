export const detectIntent = (query = "") => {
  const q = query.toLowerCase().trim();

  const intents = {
    local: 0,
    informational: 0,
    transactional: 0,
    navigational: 0,
    emergency: 0,
    quality: 0, // 🔥 NEW
  };

  /* ================= LOCAL INTENT ================= */
  if (
    q.includes("near me") ||
    q.includes("nearby") ||
    q.includes("in my city") ||
    q.includes("around me")
  ) {
    intents.local += 80;
  }

  /* ================= TRANSACTIONAL ================= */
  if (
    q.includes("buy") ||
    q.includes("price") ||
    q.includes("cheap") ||
    q.includes("best deal") ||
    q.includes("book")
  ) {
    intents.transactional += 70;
  }

  /* ================= INFORMATIONAL ================= */
  if (
    q.includes("what is") ||
    q.includes("how to") ||
    q.includes("why") ||
    q.includes("meaning")
  ) {
    intents.informational += 60;
  }

  /* ================= NAVIGATIONAL ================= */
  if (
    q.includes("contact") ||
    q.includes("phone") ||
    q.includes("address") ||
    q.includes("website")
  ) {
    intents.navigational += 60;
  }

  /* ================= EMERGENCY ================= */
  if (
    q.includes("emergency") ||
    q.includes("urgent") ||
    q.includes("hospital") ||
    q.includes("help")
  ) {
    intents.emergency += 100;
  }

  /* ================= QUALITY INTENT (NEW) ================= */
  if (
    q.includes("best") ||
    q.includes("top") ||
    q.includes("rating") ||
    q.includes("review")
  ) {
    intents.quality += 75;
  }

  /* ================= FINAL INTENT PICK ================= */
  let finalType = "default";
  let maxScore = 0;

  for (const key in intents) {
    if (intents[key] > maxScore) {
      maxScore = intents[key];
      finalType = key;
    }
  }

  return {
    type: maxScore > 0 ? finalType : "default",
    scores: intents,
  };
};