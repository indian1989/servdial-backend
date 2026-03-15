import Business from "../models/Business.js";

/* ================================
   GET PROVIDER BUSINESSES
================================ */

export const getProviderBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find({ owner: req.user._id })
      .sort({ createdAt: -1 });

    res.json(businesses);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const incrementViews = async (req, res) => {
  try {

    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    res.json(business);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};