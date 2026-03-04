import Business from "../models/Business.js";

/* =========================
   MARK BUSINESS AS FEATURED
========================= */
export const markAsFeatured = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    business.isFeatured = true;
    await business.save();

    res.json({
      success: true,
      message: "Business marked as featured",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update business",
    });
  }
};

/* =========================
   GET FEATURED BUSINESSES
========================= */
export const getFeaturedBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find({ isFeatured: true })
      .sort({ createdAt: -1 })
      .limit(12);

    res.json({
      success: true,
      businesses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch featured businesses",
    });
  }
};