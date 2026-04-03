// backend/controllers/cityController.js
import City from "../models/City.js";
import slugify from "../utils/slugify.js";

/* ================= GET ALL CITIES ================= */
export const getCities = async (req, res) => {
  try {
    const { search, state, status } = req.query;

    let query = {};

    if (state) query.state = state;
    if (status) query.status = status;

    if (search) {
      query.$text = { $search: search };
    }

    const cities = await City.find(query)
      .sort({ state: 1, district: 1, name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: cities.length,
      cities,
    });

  } catch (error) {
    console.error("GET CITIES ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


/* ================= ADD CITY ================= */
export const addCity = async (req, res) => {
  try {
    const { name, state, district, latitude, longitude } = req.body;

    if (!name || !state || !district) {
      return res.status(400).json({
        success: false,
        message: "City, district and state are required",
      });
    }

    const cleanName = name.trim();
    const cleanState = state.trim();
    const cleanDistrict = district.trim();

    const existing = await City.findOne({
      name: new RegExp(`^${cleanName}$`, "i"),
      state: new RegExp(`^${cleanState}$`, "i"),
      district: new RegExp(`^${cleanDistrict}$`, "i"),
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "City already exists in this state/district",
      });
    }

    const city = await City.create({
      name: cleanName,
      state: cleanState,
      district: cleanDistrict,
      slug: slugify(cleanName),
      stateSlug: slugify(cleanState),
      districtSlug: slugify(cleanDistrict),
      latitude,
      longitude,
    });

    res.status(201).json({
      success: true,
      message: "City added successfully",
      city,
    });

  } catch (error) {
    console.error("ADD CITY ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


/* ================= BULK UPLOAD ================= */
export const bulkUploadCities = async (req, res) => {
  try {
    const cities = req.body.cities;

    if (!Array.isArray(cities) || cities.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No cities provided",
      });
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

      const key = `${name.toLowerCase()}-${district.toLowerCase()}-${state.toLowerCase()}`;

      if (uniqueSet.has(key)) {
        failed.push({ row: i + 1, reason: "Duplicate in file" });
        continue;
      }

      uniqueSet.add(key);

      validCities.push({
        name,
        district,
        state,
        slug: slugify(name),
        stateSlug: slugify(state),
        districtSlug: slugify(district),
      });
    }

    let existingSet = new Set();

    if (validCities.length > 0) {
      const existingCities = await City.find({
        $or: validCities.map(c => ({
          name: c.name,
          state: c.state,
          district: c.district,
        }))
      }).lean();

      existingSet = new Set(
        existingCities.map(
          c => `${c.name.toLowerCase()}-${c.district.toLowerCase()}-${c.state.toLowerCase()}`
        )
      );
    }

    const operations = [];
    let skipped = 0;

    for (const c of validCities) {
      const key = `${c.name.toLowerCase()}-${c.district.toLowerCase()}-${c.state.toLowerCase()}`;

      if (existingSet.has(key)) {
        skipped++;
        continue;
      }

      operations.push({
        insertOne: { document: c },
      });
    }

    let inserted = 0;

    if (operations.length > 0) {
      const result = await City.bulkWrite(operations, { ordered: false });
      inserted = result.insertedCount || operations.length;
    }

    res.json({
      success: true,
      message: "Bulk upload completed",
      total: cities.length,
      inserted,
      skipped,
      failedCount: failed.length,
      failed,
    });

  } catch (error) {
    console.error("BULK UPLOAD ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


/* ================= UPDATE CITY ================= */
export const updateCity = async (req, res) => {
  try {
    const { id } = req.params;

    const city = await City.findById(id);
    if (!city) {
      return res.status(404).json({ success: false, message: "City not found" });
    }

    const updates = { ...req.body };

    if (updates.name) updates.slug = slugify(updates.name);
    if (updates.state) updates.stateSlug = slugify(updates.state);
    if (updates.district) updates.districtSlug = slugify(updates.district);

    const updatedCity = await City.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "City updated successfully",
      city: updatedCity,
    });

  } catch (error) {
    console.error("UPDATE CITY ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


/* ================= DELETE CITY ================= */
export const deleteCity = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);

    if (!city) {
      return res.status(404).json({ success: false, message: "City not found" });
    }

    await city.deleteOne();

    res.json({
      success: true,
      message: "City deleted successfully",
    });

  } catch (error) {
    console.error("DELETE CITY ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


/* ================= STATES ================= */
export const getStates = async (req, res) => {
  try {
    const states = await City.aggregate([
      {
        $group: {
          _id: "$stateSlug",
          name: { $first: "$state" }
        }
      },
      { $sort: { name: 1 } }
    ]);

    res.json({ success: true, states });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


/* ================= DISTRICTS ================= */
export const getDistrictsByState = async (req, res) => {
  try {
    const { stateSlug } = req.params;

    const districts = await City.aggregate([
      { $match: { stateSlug } },
      {
        $group: {
          _id: "$districtSlug",
          name: { $first: "$district" }
        }
      },
      { $sort: { name: 1 } }
    ]);

    res.json({ success: true, districts });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


/* ================= CITIES BY DISTRICT ================= */
export const getCitiesByDistrict = async (req, res) => {
  try {
    const { districtSlug } = req.params;

    const cities = await City.find({
      districtSlug,
      status: "active"
    }).sort({ name: 1 }).lean();

    res.json({
      success: true,
      cities,
    });

  } catch (error) {
    console.error("GET CITIES BY DISTRICT ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


/* ================= FEATURE ================= */
export const getFeaturedCities = async (req, res) => {
  try {
    const cities = await City.find({
      featured: true,
      status: "active",
    })
      .sort({ name: 1 })
      .limit(12)
      .lean();

    res.json({
      success: true,
      count: cities.length,
      cities,
    });

  } catch (error) {
    console.error("FEATURED CITY ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markCityAsFeatured = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);

    if (!city) {
      return res.status(404).json({ success: false, message: "City not found" });
    }

    city.featured = true;
    await city.save();

    res.json({
      success: true,
      message: `${city.name} marked as featured`,
      city,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const unmarkCityAsFeatured = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);

    if (!city) {
      return res.status(404).json({ success: false, message: "City not found" });
    }

    city.featured = false;
    await city.save();

    res.json({
      success: true,
      message: `${city.name} removed from featured`,
      city,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};