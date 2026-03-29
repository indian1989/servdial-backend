export const detectIntent = (query = "") => {
  const q = query.toLowerCase().trim();

  const intents = {
    local: 0,
    informational: 0,
    transactional: 0,
    navigational: 0,
    emergency: 0,
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

  /* ================= EMERGENCY BOOST ================= */
  if (
    q.includes("emergency") ||
    q.includes("urgent") ||
    q.includes("hospital") ||
    q.includes("help")
  ) {
    intents.emergency += 100;
  }

  return intents;
};