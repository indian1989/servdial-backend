import Business from "../models/Business.js";
import Category from "../models/Category.js"; // ensure this exists

/* ================================
   GET PROVIDER BUSINESSES (WITH CATEGORY NAMES)
================================ */
export const getProviderBusinesses = async (req, res) => {
  try {
    // Fetch businesses owned by the provider
    const businesses = await Business.find({ owner: req.user._id }).sort({
      createdAt: -1,
    });

    // Fetch all categories for mapping
    const categories = await Category.find(); // assuming Category schema has _id & name
    const categoriesMap = {};
    categories.forEach((cat) => {
      categoriesMap[cat._id] = cat.name;
    });

    // Map category IDs to names
    const businessesWithCategoryNames = businesses.map((biz) => ({
      ...biz._doc,
      categoryName: categoriesMap[biz.category] || biz.category,
    }));

    res.json(businessesWithCategoryNames);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================================
   INCREMENT BUSINESS VIEWS
================================ */
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

/* ================================
   PHONE CLICKS
================================ */
export const phoneClick = async (req, res) => {
  try {
    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { $inc: { phoneClicks: 1 } },
      { new: true }
    );
    res.json(business);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================================
   WHATSAPP CLICKS
================================ */
export const whatsappClick = async (req, res) => {
  try {
    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { $inc: { whatsappClicks: 1 } },
      { new: true }
    );
    res.json(business);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};