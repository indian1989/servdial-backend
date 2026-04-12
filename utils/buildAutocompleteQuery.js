export const buildAutocompleteQuery = (searchText) => {
  if (!searchText || searchText.trim().length === 0) {
    return {};
  }

  // ================= SAFE REGEX =================
  const escapeRegex = (str) =>
    str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const text = searchText.trim().toLowerCase();
  const safeText = escapeRegex(text);

  const regex = new RegExp(safeText, "i");

  return {
    status: "approved",
    isDeleted: false,

    $or: [
      { name: regex },
      { tags: regex },

      // ✅ BETTER: slug-based matching
      { categorySlug: regex },

      // ❌ REMOVED city (IMPORTANT)
      // cityId handled outside
    ],
  };
};