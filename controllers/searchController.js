import Business from "../models/Business.js";
import { rankBusinesses } from "../utils/rankBusinesses.js";
import asyncHandler from "express-async-handler";

export const searchBusinesses = asyncHandler(async (req, res) => {
  const {
    city,
    category,
    keyword,
    rating,
    page = 1,
    limit = 12,
    lat,
    lng,
    distance,
    openNow,
  } = req.query;

  const pageNum = Number(page);
  const limitNum = Number(limit);

  const query = buildSearchQuery({
    city,
    category,
    keyword,
    rating,
    openNow,
  });

  query.status = "approved";

  let businesses = [];
  let total = 0;

  // ================= GEO SEARCH =================
  if (lat && lng && distance) {
    const pipeline = [
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [Number(lng), Number(lat)],
          },
          distanceField: "distance",
          maxDistance: Number(distance),
          spherical: true,
        },
      },
      { $match: query },
    ];

    // TOTAL COUNT (correct way)
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await Business.aggregate(countPipeline);
    total = countResult[0]?.total || 0;

    // PAGINATED DATA
    businesses = await Business.aggregate([
      ...pipeline,
      {
        $sort: {
          isFeatured: -1,
          featurePriority: -1,
          averageRating: -1,
          views: -1,
        },
      },
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum },
    ]);
  }

  // ================= NORMAL SEARCH =================
  else {
    businesses = await Business.find(query)
      .sort({
        isFeatured: -1,
        featurePriority: -1,
        averageRating: -1,
        views: -1,
      })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    total = await Business.countDocuments(query);
  }

  res.status(200).json({
    success: true,
    businesses,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  });
});