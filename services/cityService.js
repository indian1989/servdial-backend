// backend/services/cityService.js
import City from "../models/City.js";
import slugify from "../utils/slugify.js";
import { getCache, setCache, clearCache } from "../utils/memoryCache.js";

/* ================= UTIL ================= */
const normalize = (str) =>
  str?.trim().toLowerCase().replace(/\s+/g, " ");

const escapeRegex = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ================= CREATE CITY ================= */
export const createCityService = async (data) => {
  const { name, district, state, latitude, longitude } = data;

  if (!name || !district || !state) {
    throw new Error("name, district, state are required");
  }

  const cleanName = name.trim();
  const cleanDistrict = district.trim();
  const cleanState = state.trim();

  // 🔥 STRICT DUPLICATE CHECK (case-insensitive safe)
  const exists = await City.findOne({
  name: new RegExp(`^${escapeRegex(cleanName)}$`, "i"),
  district: new RegExp(`^${escapeRegex(cleanDistrict)}$`, "i"),
  state: new RegExp(`^${escapeRegex(cleanState)}$`, "i"),
});

  if (exists) {
    throw new Error("City already exists");
  }

  const newCity = await City.create({
  name: cleanName,
  district: cleanDistrict,
  state: cleanState,
  latitude,
  longitude,
});

clearCache();

return newCity;
};

/* ================= GET CITIES ================= */
export const getCitiesService = async (query) => {

  if (query.dropdown === "true") {
  const cities = await City.find({
  $or: [
    { status: "active" },
    { status: { $exists: false } }
  ]
})
  .sort({ name: 1 })
  .select("name slug state")
  .lean();

console.log("DROPDOWN CITIES COUNT:", cities.length);

  return {
    cities,
    total: cities.length,
    page: 1,
    pages: 1,
  };
}

    const {
    search,
    state,
    status = "active",
    page = 1,
    limit = 50000,
  } = query;

  const cacheKey = `cities:${JSON.stringify({
  search,
  state,
  status,
  page,
  limit
})}`;

  const filter = { status };

  if (state) filter.state = state;

  // 🔥 IMPROVED SEARCH (no prefix restriction)
  if (search) {
    const safe = escapeRegex(search.trim());

    filter.$or = [
      { name: new RegExp(safe, "i") },
      { district: new RegExp(safe, "i") },
      { state: new RegExp(safe, "i") },
    ];
  }

  const skip = (page - 1) * Number(limit);

  const [cities, total] = await Promise.all([
    City.find(filter)
      .sort({
  featured: -1,
  popular: -1,
  state: 1,
  district: 1,
  name: 1,
})
      .skip(skip)
      .limit(Number(limit))
      .lean(),

    City.countDocuments(filter),
  ]);

  const result = {
  cities,
  total,
  page: Number(page),
  pages: Math.ceil(total / limit),
};

setCache(cacheKey, result, 300); // 5 min

return result;
};

/* ================= UPDATE CITY ================= */
export const updateCityService = async (id, data) => {
  const city = await City.findById(id);

  if (!city) {
    throw new Error("City not found");
  }

  // 🔥 SLUG HISTORY SAFE UPDATE
  if (data.name && slugify(data.name) !== city.slug) {
    city.slugHistory = city.slugHistory || [];

    if (!city.slugHistory.includes(city.slug)) {
      city.slugHistory.push(city.slug);
    }

    city.slug = slugify(data.name);
  }

  if (data.state) city.stateSlug = slugify(data.state);
  if (data.district) city.districtSlug = slugify(data.district);

  Object.assign(city, data);

  await city.save();

clearCache();

return city;
};

/* ================= DELETE CITY ================= */
export const deleteCityService = async (id) => {
  const city = await City.findById(id);

  if (!city) {
    throw new Error("City not found");
  }

  await city.deleteOne();

clearCache();

return true;
};

/* ================= FEATURE CITY ================= */
export const featureCityService = async (id, value) => {
  const city = await City.findById(id);

  if (!city) {
    throw new Error("City not found");
  }

  // 🔥 FIXED FEATURE SYSTEM
  city.featured = value > 0;
  city.featuredScore = value;

  await city.save();

clearCache();

return city;
};

/* ================= STATES ================= */
export const getStatesService = async () => {
  const cacheKey = "states";

  const cached = getCache(cacheKey);
  if (cached) return cached;

  const states = await City.aggregate([
    {
      $group: {
        _id: "$stateSlug",
        name: { $first: "$state" },
      },
    },
    { $sort: { name: 1 } },
  ]);

  setCache(cacheKey, states, 3600); // 1 hour

  return states;
};

/* ================= DISTRICTS ================= */
export const getDistrictsService = async (stateSlug) => {
  const cacheKey = `districts:${stateSlug}`;

  const cached = getCache(cacheKey);
  if (cached) return cached;

  const districts = await City.aggregate([
    { $match: { stateSlug } },
    {
      $group: {
        _id: "$districtSlug",
        name: { $first: "$district" },
      },
    },
    { $sort: { name: 1 } },
  ]);

  setCache(cacheKey, districts, 3600); // 1 hour

  return districts;
};

/* ================= CITIES BY DISTRICT ================= */
export const getCitiesByDistrictService = async (districtSlug) => {
  const cacheKey = `citiesByDistrict:${districtSlug}`;

  const cached = getCache(cacheKey);
  if (cached) return cached;

  const cities = await City.find({
    districtSlug,
    status: "active",
  })
    .sort({ name: 1 })
    .lean();

  setCache(cacheKey, cities, 3600); // 1 hour

  return cities;
};

/* ================= BULK UPLOAD ================= */
export const bulkUploadCitiesService = async (cities) => {
  if (!Array.isArray(cities) || cities.length === 0) {
    throw new Error("No cities provided");
  }

  const validCities = [];
  const failed = [];
  const uniqueSet = new Set();

  for (let i = 0; i < cities.length; i++) {
    const row = cities[i];

    const name = row.name?.trim();
    const district = row.district?.trim();
    const state = row.state?.trim();

    if (!name || !district || !state) {
      failed.push({ row: i + 1, reason: "Missing fields" });
      continue;
    }

    const key = `${normalize(name)}-${normalize(district)}-${normalize(state)}`;

    if (uniqueSet.has(key)) {
      failed.push({ row: i + 1, reason: "Duplicate in file" });
      continue;
    }

    uniqueSet.add(key);

    validCities.push({
  name,
  district,
  state,
});
  }

  // 🔥 CHECK EXISTING IN DB
    
    let existingCities = [];

if (validCities.length > 0) {
  existingCities = await City.find({
    $or: validCities.map((c) => ({
      name: new RegExp(`^${escapeRegex(c.name)}$`, "i"),
      district: new RegExp(`^${escapeRegex(c.district)}$`, "i"),
      state: new RegExp(`^${escapeRegex(c.state)}$`, "i"),
    })),
  }).lean();
}

  const existingSet = new Set(
    existingCities.map(
      (c) =>
        `${normalize(c.name)}-${normalize(c.district)}-${normalize(c.state)}`
    )
  );

  const operations = [];
  let skipped = 0;

  for (const c of validCities) {
    const key = `${normalize(c.name)}-${normalize(c.district)}-${normalize(c.state)}`;

    if (existingSet.has(key)) {
      skipped++;
      continue;
    }

    operations.push({
  insertOne: {
    document: {
  name: c.name.trim(),
  district: c.district.trim(),
  state: c.state.trim(),

  slug: slugify(c.name),
  stateSlug: slugify(c.state),
  districtSlug: slugify(c.district),

  status: "active",
  country: "India",
},
  },
});
  }

  let inserted = 0;

  if (operations.length > 0) {
    const result = await City.bulkWrite(operations, { ordered: false });
    inserted = result.insertedCount || operations.length;
  }

  // 🔥 FIX: ensure pre-save logic applied

  clearCache();

  return {
    total: cities.length,
    inserted,
    skipped,
    failedCount: failed.length,
    failed,
  };
};

// 🔥 RE-FETCH TO TRIGGER SLUG CONSISTENCY CHECK (optional safety)