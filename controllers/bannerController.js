import Banner from "../models/Banner.js";

/* =========================
   CREATE BANNER (Admin Only)
========================= */
export const createBanner = async (req, res) => {
  try {
    const { title, image, link } = req.body;

    const banner = await Banner.create({
      title,
      image,
      link,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      banner,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create banner",
    });
  }
};

/* =========================
   GET ACTIVE BANNERS
========================= */
export const getBanners = async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      banners,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch banners",
    });
  }
};

/* =========================
   DELETE BANNER (Admin Only)
========================= */
export const deleteBanner = async (req, res) => {
  try {
    await Banner.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Banner deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete banner",
    });
  }
};