// backend/utils/intentDetector.js

/**
 * =========================================================
 * 🧠 INTENT DETECTOR
 * =========================================================
 * RESPONSIBILITY:
 * ONLY classify user intent category
 *
 * MUST NOT:
 * - clean query
 * - parse filters
 * - parse categories
 * - parse city
 * =========================================================
 */

export const detectIntent = (
  query = ""
) => {
  const q = query
    .toLowerCase()
    .trim();

  const scores = {
    local: 0,
    informational: 0,
    transactional: 0,
    navigational: 0,
    emergency: 0,
    quality: 0,
  };

  /* =====================================================
     LOCAL
  ===================================================== */

  if (
    q.includes("near me") ||
    q.includes("nearby") ||
    q.includes("around me") ||
    q.includes("closest") ||
    q.includes("nearest")
  ) {
    scores.local += 80;
  }

  /* =====================================================
     TRANSACTIONAL
  ===================================================== */

  if (
    q.includes("buy") ||
    q.includes("book") ||
    q.includes("hire") ||
    q.includes("cheap") ||
    q.includes("price")
  ) {
    scores.transactional += 70;
  }

  /* =====================================================
     INFORMATIONAL
  ===================================================== */

  if (
    q.includes("what is") ||
    q.includes("how to") ||
    q.includes("why") ||
    q.includes("guide")
  ) {
    scores.informational += 60;
  }

  /* =====================================================
     NAVIGATIONAL
  ===================================================== */

  if (
    q.includes("contact") ||
    q.includes("phone") ||
    q.includes("website") ||
    q.includes("address")
  ) {
    scores.navigational += 60;
  }

  /* =====================================================
     EMERGENCY
  ===================================================== */

  if (
    q.includes("emergency") ||
    q.includes("urgent") ||
    q.includes("immediate") ||
    q.includes("asap")
  ) {
    scores.emergency += 100;
  }

  /* =====================================================
     QUALITY
  ===================================================== */

  if (
    q.includes("best") ||
    q.includes("top") ||
    q.includes("rating") ||
    q.includes("review")
  ) {
    scores.quality += 75;
  }

  /* =====================================================
     FINAL PICK
  ===================================================== */

  let type = "default";
  let highest = 0;

  for (const key in scores) {
    if (scores[key] > highest) {
      highest = scores[key];
      type = key;
    }
  }

  return {
    type,
    score: highest,
    scores,
  };
};