// backend/utils/parseSearchIntent.js

export const parseSearchIntent = (keyword = "") => {
  if (!keyword) return {};

  const query = keyword
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const intent = {
    sortBy: null,
    minRating: null,
    pricePreference: null,
    openNow: false,
    isNearMe: false,
    isEmergency: false,
  };

  const has = (words) =>
    words.some((w) => query.includes(w));

  /* ================= RATING INTENT ================= */
  if (has(["best", "top", "recommended"])) {
    intent.sortBy = "rating";
    intent.minRating = 4;
  }

  /* ================= PRICE INTENT ================= */
  if (has(["cheap", "low price", "budget", "affordable"])) {
    intent.pricePreference = "low";
  }

  if (has(["premium", "luxury", "expensive", "high end"])) {
    intent.pricePreference = "high";
  }

  /* ================= OPEN NOW ================= */
  if (
    has(["open now", "24 hour", "24x7", "open 24", "always open"])
  ) {
    intent.openNow = true;
  }

  /* ================= NEAR ME ================= */
  if (
    has(["near me", "nearby", "near by", "closest", "nearest"])
  ) {
    intent.isNearMe = true;
  }

  /* ================= EMERGENCY ================= */
  if (
    has(["emergency", "urgent", "immediate", "asap"])
  ) {
    intent.isEmergency = true;
  }

  return intent;
};