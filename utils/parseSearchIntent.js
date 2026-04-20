export const parseSearchIntent = (keyword = "") => {
  if (!keyword) return {};

  const query = keyword.toLowerCase();

  let intent = {
    sortBy: null,
    minRating: null,
    pricePreference: null,
    openNow: false,
    isNearMe: false,
    isEmergency: false,
  };

  /* ================= RATING INTENT ================= */
  if (query.includes("best") || query.includes("top")) {
    intent.sortBy = "rating";
    intent.minRating = 4;
  }

  /* ================= PRICE INTENT ================= */
  if (query.includes("cheap") || query.includes("low price")) {
    intent.pricePreference = "low";
  }

  if (query.includes("premium") || query.includes("luxury")) {
    intent.pricePreference = "high";
  }

  /* ================= OPEN NOW ================= */
  if (
    query.includes("open now") ||
    query.includes("24 hour") ||
    query.includes("24x7")
  ) {
    intent.openNow = true;
  }

  /* ================= NEAR ME ================= */
  if (query.includes("near me") || query.includes("nearby")) {
    intent.isNearMe = true;
  }

  /* ================= EMERGENCY ================= */
  if (query.includes("emergency") || query.includes("urgent")) {
    intent.isEmergency = true;
  }

  return intent;
};