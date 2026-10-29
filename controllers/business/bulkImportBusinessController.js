// backend/controllers/business/bulkImportBusinessController.js

import asyncHandler from "express-async-handler";
import multer from "multer";
import csv from "csv-parser";
import { Readable } from "node:stream";

import Business from "../../models/Business.js";
import City from "../../models/City.js";
import Category from "../../models/Category.js";

import { normalizeBusinessHours } from "../../utils/normalizeBusinessHours.js";
import { pingGoogleSitemap } from "../../utils/pingSitemap.js";
import { geocodeAddress } from "../../services/geocodeService.js";
import generateMeta from "../../utils/seoMeta.js";
import { generateBusinessSlug } from "../../services/business/businessSlugService.js";

const MAX_ROWS = 500;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// --------------------------------------------------
// BULK IMPORT LIVE PROGRESS
// --------------------------------------------------

const bulkImportProgressJobs = new Map();
const PROGRESS_TTL_MS = 30 * 60 * 1000;

const updateImportProgress = (requestId, updates = {}) => {
  const job = bulkImportProgressJobs.get(requestId);

  if (!job) return;

  Object.assign(job, updates, {
    updatedAt: new Date().toISOString(),
  });
};

// Admin endpoint: read live import progress
export const getBulkImportProgress = asyncHandler(
  async (req, res) => {
    if (!["admin", "superadmin"].includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    const job = bulkImportProgressJobs.get(req.params.requestId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Import progress not found or expired.",
      });
    }

    return res.status(200).json({
      success: true,
      progress: {
        requestId: job.requestId,
        status: job.status,
        total: job.total,
        processed: job.processed,
        created: job.created,
        skipped: job.skipped,
        failed: job.failed,
        pending:
          job.total === null
            ? null
            : Math.max(0, job.total - job.processed),
        percentage:
          job.total
            ? Math.round((job.processed / job.total) * 100)
            : 0,
        message: job.message,
        results: job.results,
        updatedAt: job.updatedAt,
      },
    });
  }
);

// --------------------------------------------------
// CSV UPLOAD
// --------------------------------------------------

export const bulkImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    const isCsv =
      file.originalname.toLowerCase().endsWith(".csv") ||
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel";

    if (!isCsv) {
      const error = new Error("Please upload a CSV file.");
      error.status = 400;
      return callback(error);
    }

    callback(null, true);
  },
});

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const normalizeText = (value) =>
  String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const normalizeHeader = (value) =>
  String(value ?? "")
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getValue = (row, ...headers) => {
  const keys = Object.keys(row);

  for (const header of headers) {
    const target = normalizeHeader(header);

    const key = keys.find(
      (candidate) => normalizeHeader(candidate) === target
    );

    if (key !== undefined && String(row[key] ?? "").trim()) {
      return String(row[key]).trim();
    }
  }

  return "";
};

const splitList = (value) =>
  String(value || "")
    .split(/[;|]/)
    .map((item) => item.trim())
    .filter(Boolean);

const cleanMobile = (value) =>
  String(value || "").replace(/\D/g, "").slice(-10);

const cleanLandline = (value) =>
  String(value || "").replace(/\D/g, "");

const parseBoolean = (value) =>
  ["true", "yes", "1", "y"].includes(normalizeText(value));

const parseCoordinates = (value) => {
  if (!value) return null;

  const parts = String(value)
    .split(",")
    .map((part) => Number(part.trim()));

  if (
    parts.length !== 2 ||
    parts.some((part) => !Number.isFinite(part))
  ) {
    return null;
  }

  const [lat, lng] = parts;

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return {
    type: "Point",
    coordinates: [lng, lat],
  };
};

const parseBusinessHours = (row) => {
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const hours = {};

  for (const day of days) {
    const open = getValue(row, `${day} Open`);
    const close = getValue(row, `${day} Close`);
    const closed = parseBoolean(getValue(row, `${day} Closed`));

    if (open || close || closed) {
      hours[day.toLowerCase()] = {
        open,
        close,
        closed,
      };
    }
  }

  return normalizeBusinessHours(hours);
};

const cityKey = (name, district, state) =>
  [
    normalizeText(name),
    normalizeText(district),
    normalizeText(state),
  ].join("|");

// Mobile numbers are normalized to 10 digits.
// Landlines retain their full digit sequence.
// Cross-field comparisons are supported.
const getBusinessContactNumbers = (business) =>
  [
    cleanMobile(business.phone),
    cleanMobile(business.alternatePhone),
    cleanLandline(business.landline),
  ].filter(Boolean);

// --------------------------------------------------
// BULK IMPORT
// --------------------------------------------------

export const bulkImportBusinesses = asyncHandler(async (req, res) => {
  const requestId =
    req.headers["x-request-id"] || "not-provided";

  console.log("[BULK IMPORT START]", {
    time: new Date().toISOString(),
    file: req.file?.originalname,
    requestId,
  });

  if (!["admin", "superadmin"].includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: "Admin access required.",
    });
  }

  if (!req.file?.buffer) {
    return res.status(400).json({
      success: false,
      message: 'Upload a CSV file using the "file" field.',
    });
  }

    // Remove expired progress jobs
  const now = Date.now();

  for (const [id, job] of bulkImportProgressJobs) {
    if (
      now - new Date(job.updatedAt).getTime() >
      PROGRESS_TTL_MS
    ) {
      bulkImportProgressJobs.delete(id);
    }
  }

  bulkImportProgressJobs.set(requestId, {
    requestId,
    status: "parsing",
    total: null,
    processed: 0,
    created: 0,
    skipped: 0,
    failed: 0,
    results: [],
    message: "Reading CSV file...",
    updatedAt: new Date().toISOString(),
  });

  // ------------------------------------------------
  // 1. Parse CSV
  // ------------------------------------------------

  const rows = [];

  try {
    const parser = Readable.from([req.file.buffer]).pipe(csv());

    for await (const row of parser) {
      rows.push(row);

      if (rows.length > MAX_ROWS) {
  updateImportProgress(requestId, {
    status: "failed",
    message: `A maximum of ${MAX_ROWS} businesses can be imported per upload.`,
  });

  return res.status(400).json({
    success: false,
    message: `A maximum of ${MAX_ROWS} businesses can be imported per upload.`,
  });
}
    }
  } catch (error) {

updateImportProgress(requestId, {
  status: "failed",
  message: "Could not parse the CSV file.",
});

    console.error("[BULK IMPORT CSV ERROR]", {
      requestId,
      error: error.message,
    });

    return res.status(400).json({
      success: false,
      message:
        "Could not parse the CSV. Please check its format and encoding.",
    });
  }


  if (!rows.length) {
  updateImportProgress(requestId, {
    status: "failed",
    message: "The CSV contains no business rows.",
  });

  return res.status(400).json({
    success: false,
    message: "The CSV contains no business rows.",
  });
}

    updateImportProgress(requestId, {
    status: "processing",
    total: rows.length,
    message: "Import started...",
  });

  // ------------------------------------------------
  // 2. Load categories and cities once
  // ------------------------------------------------

  const [categories, cities] = await Promise.all([
    Category.find({ status: "active" })
      .select("_id name level parentCategory slug")
      .lean(),

    City.find({ status: "active" })
      .select("_id name district state country latitude longitude slug")
      .lean(),
  ]);

  const categoryByName = new Map();

  for (const category of categories) {
    const key =
      `${category.level}:` +
      `${normalizeText(category.name)}:` +
      `${String(category.parentCategory || "")}`;

    categoryByName.set(key, category);
  }

  const parentByName = new Map();

  for (const category of categories) {
    if (Number(category.level) === 0) {
      parentByName.set(normalizeText(category.name), category);
    }
  }

  const citiesByKey = new Map();

  for (const city of cities) {
    const key = cityKey(city.name, city.district, city.state);
    const matches = citiesByKey.get(key) || [];

    matches.push(city);
    citiesByKey.set(key, matches);
  }

  // ------------------------------------------------
  // 3. Find existing records by contact number
  // ------------------------------------------------
  // Match phone, alternatePhone and landline against
  // all three fields, consistent with contact-based
  // duplicate validation in the normal create flow.
  //
  // WhatsApp is intentionally excluded.
  // Business name and area alone are not duplicate keys.

  const csvContactNumbers = new Set();

  for (const row of rows) {
    const phone = cleanMobile(
      getValue(row, "Mobile", "Phone")
    );

    const alternatePhone = cleanMobile(
      getValue(row, "Alternate Mobile", "Alternate Phone")
    );

    const landline = cleanLandline(
      getValue(row, "Landline")
    );

    [phone, alternatePhone, landline]
      .filter(Boolean)
      .forEach((number) => csvContactNumbers.add(number));
  }

  const contactNumbers = [...csvContactNumbers];

  const existingContacts = contactNumbers.length
    ? await Business.find({
        $or: [
          { phone: { $in: contactNumbers } },
          { alternatePhone: { $in: contactNumbers } },
          { landline: { $in: contactNumbers } },
        ],
      })
        .select("_id name phone alternatePhone landline")
        .lean()
    : [];

  const contactOwnersByNumber = new Map();

  const registerContact = (number, business) => {
    if (!number || !business?._id) return;

    const key = String(number).replace(/\D/g, "");

    if (!key) return;

    const owners = contactOwnersByNumber.get(key) || [];

    if (
      !owners.some(
        (owner) => String(owner._id) === String(business._id)
      )
    ) {
      owners.push(business);
      contactOwnersByNumber.set(key, owners);
    }
  };

  for (const business of existingContacts) {
    for (const number of getBusinessContactNumbers(business)) {
      registerContact(number, business);
    }
  }

  // ------------------------------------------------
  // 4. Process each row sequentially
  // ------------------------------------------------

  const results = [];

  let createdCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNumber = index + 2;

    const name = getValue(row, "Business Name", "Name");

    try {
      // "Category" is accepted as an alias for
      // "Parent Category" for compatible CSV templates.
      const parentName = getValue(
        row,
        "Parent Category",
        "ParentCategory"
      );

      const subcategoryName = getValue(
        row,
        "Subcategory",
        "Sub Category"
      );

      const districtInput = getValue(row, "District");
      const stateInput = getValue(row, "State");
      const cityName = getValue(row, "City");

      const pincode = getValue(
        row,
        "Pincode",
        "PIN Code",
        "Postal Code"
      ).replace(/\D/g, "");

      const phone = cleanMobile(
        getValue(row, "Mobile", "Phone")
      );

      const alternatePhone = cleanMobile(
        getValue(row, "Alternate Mobile", "Alternate Phone")
      );

      const whatsapp = cleanMobile(
        getValue(row, "WhatsApp", "Whatsapp")
      );

      const landline = cleanLandline(
        getValue(row, "Landline")
      );

      // ----------------------------------------------
      // Required fields and contact validation
      // ----------------------------------------------

      const required = [
        ["Business Name", name],
        ["Parent Category", parentName],
        ["Subcategory", subcategoryName],
        ["City", cityName],
        ["District", districtInput],
        ["State", stateInput],
        ["Pincode", pincode],
      ];

      const missing = required.find(([, value]) => !value);

      if (missing) {
        throw new Error(`${missing[0]} is required.`);
      }

      if (!/^\d{6}$/.test(pincode)) {
        throw new Error("Pincode must contain exactly 6 digits.");
      }

      if (!phone && !landline) {
        throw new Error("Mobile or Landline is required.");
      }

      if (phone && phone.length !== 10) {
        throw new Error("Mobile must contain 10 digits.");
      }

      if (alternatePhone && alternatePhone.length !== 10) {
        throw new Error("Alternate Mobile must contain 10 digits.");
      }

      if (whatsapp && whatsapp.length !== 10) {
        throw new Error("WhatsApp must contain 10 digits.");
      }

      if (landline && (landline.length < 6 || landline.length > 12)) {
        throw new Error("Landline must contain 6–12 digits.");
      }

      // ----------------------------------------------
      // Parent category and subcategory
      // ----------------------------------------------

      const parent = parentByName.get(normalizeText(parentName));

      if (!parent) {
        throw new Error(
          `Active Parent Category "${parentName}" not found.`
        );
      }

      const category = categoryByName.get(
        `1:${normalizeText(subcategoryName)}:${String(parent._id)}`
      );

      if (!category) {
        throw new Error(
          `Subcategory "${subcategoryName}" does not belong to Parent Category "${parentName}".`
        );
      }

      // ----------------------------------------------
      // Leaf categories
      // ----------------------------------------------

      const leafNames = [
        getValue(row, "Leaf Category 1", "Leaf Category1", "Leaf Category"),
        getValue(row, "Leaf Category 2", "Leaf Category2"),
        getValue(row, "Leaf Category 3", "Leaf Category3"),
        getValue(row, "Leaf Category 4", "Leaf Category4"),
        getValue(row, "Leaf Category 5", "Leaf Category5"),
      ].filter(Boolean);

      if (
        new Set(leafNames.map(normalizeText)).size !== leafNames.length
      ) {
        throw new Error("Duplicate Leaf Categories are not allowed.");
      }

      const secondaryCategories = [];

      for (const leafName of leafNames) {
        const leaf = categoryByName.get(
          `2:${normalizeText(leafName)}:${String(category._id)}`
        );

        if (!leaf) {
          throw new Error(
            `Leaf Category "${leafName}" not found under "${subcategoryName}".`
          );
        }

        secondaryCategories.push(leaf._id);
      }

      // ----------------------------------------------
      // City validation
      // ----------------------------------------------

      const matchingCities =
        citiesByKey.get(
          cityKey(cityName, districtInput, stateInput)
        ) || [];

      if (matchingCities.length !== 1) {
        throw new Error(
          matchingCities.length
            ? "City match is ambiguous. Check City, District and State."
            : `Active City "${cityName}, ${districtInput}, ${stateInput}" not found.`
        );
      }

      const city = matchingCities[0];

      // ----------------------------------------------
      // Duplicate contact validation
      // ----------------------------------------------
      // Admin/superadmin may explicitly confirm a shared
      // contact with Confirm Duplicate Contact = TRUE.
      // No confirmation means the row is skipped.
      //
      // Newly created records are registered immediately,
      // so later rows in this same CSV are also checked.

      const duplicateNumbers = [
        ...new Set([phone, alternatePhone, landline].filter(Boolean)),
      ];

      const duplicateBusinesses = new Map();

      for (const number of duplicateNumbers) {
        const owners = contactOwnersByNumber.get(number) || [];

        for (const owner of owners) {
          duplicateBusinesses.set(String(owner._id), owner);
        }
      }

      const duplicates = [...duplicateBusinesses.values()];

      const confirmDuplicate = parseBoolean(
        getValue(row, "Confirm Duplicate Contact")
      );

      if (duplicates.length && !confirmDuplicate) {
        skippedCount += 1;

        results.push({
          row: rowNumber,
          status: "skipped",
          businessName: name,
          message:
            `Duplicate contact found for "${duplicates[0].name}". ` +
            "Business skipped. Set Confirm Duplicate Contact to TRUE " +
            "only if this contact is legitimately shared.",
        });

                updateImportProgress(requestId, {
          processed: index + 1,
          created: createdCount,
          skipped: skippedCount,
          failed: failedCount,
          results: [...results],
          message: `Processed ${index + 1} of ${rows.length} rows`,
        });

        continue;
      }

      // ----------------------------------------------
      // Address
      // ----------------------------------------------

      const address = {
        street: getValue(row, "Street"),
        area: getValue(row, "Area"),
        landmark: getValue(row, "Landmark"),
      };

      const district = districtInput || city.district;
      const state = stateInput || city.state;
      const country = getValue(row, "Country") || city.country || "India";
      const countryCode = getValue(row, "Country Code") || "IN";

      const fullAddress = [
        address.street,
        address.landmark,
        address.area,
        city.name,
        district,
        state,
        pincode,
        country,
      ]
        .filter(Boolean)
        .join(", ");

      // ----------------------------------------------
      // Coordinates / geocoding
      // ----------------------------------------------

      let location = parseCoordinates(
        getValue(row, "Google Map Coordinates", "Coordinates")
      );

      if (!location) {
        try {
          const geocoded = await geocodeAddress({
            address: fullAddress,
            city: city.name,
            district,
            state,
            pincode,
            country,
          });

          if (geocoded?.location) {
            location = geocoded.location;
          }
        } catch (error) {
          console.warn("[BULK IMPORT GEOCODING WARNING]", {
            row: rowNumber,
            businessName: name,
            error: error.message,
          });
        }
      }

      if (!location) {
        const lat = Number(city.latitude);
        const lng = Number(city.longitude);

        if (
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          lat >= -90 &&
          lat <= 90 &&
          lng >= -180 &&
          lng <= 180
        ) {
          location = {
            type: "Point",
            coordinates: [lng, lat],
          };
        }
      }

      if (!location) {
        throw new Error(
          "No valid coordinates or city coordinates available. Add Google Map Coordinates as latitude,longitude."
        );
      }

      // ----------------------------------------------
      // Services and service coverage
      // ----------------------------------------------

      const services = splitList(
        getValue(row, "Services List", "Services")
      ).map((serviceName) => ({
        name: serviceName,
        description: "",
      }));

      const serviceTypes = splitList(
        getValue(row, "Service Type")
      );

      const serviceArea = getValue(row, "Service Area");

      const serviceCoverage = {
        type: "city",
        mode: "selected",
        cities: [],
        areas: serviceArea
          ? [
              {
                name: serviceArea,
                cityId: city._id,
                cityName: city.name,
                district: city.district,
                state: city.state,
                country,
                countryCode,
              },
            ]
          : [],
        states: [],
        countries: [],
      };

      const businessHours = parseBusinessHours(row);

      const foodType = getValue(row, "Food Type").toLowerCase();
      const website = getValue(row, "Website");
      const description = getValue(row, "Description");

      // ----------------------------------------------
      // Slug and SEO
      // ----------------------------------------------

      const slug = await generateBusinessSlug(
        name,
        city._id,
        address.area
      );

      const seoMeta = generateMeta({
        city: city.name,
        category: category.name,
        businessName: name,
        area: address.area,
        services,
        isVerified: true,
        citySlug: city.slug,
        categorySlug: category.slug,
        businessSlug: slug,
      });

      // ----------------------------------------------
      // Create business
      // ----------------------------------------------

      const business = await Business.create({
        owner: null,
        name: name.trim(),

        categoryId: category._id,
        secondaryCategoryIds: secondaryCategories,

        cityId: city._id,
        cityName: city.name.toLowerCase(),
        citySlug: city.slug,
        categorySlug: category.slug,
        slug,

        address,
        district,
        state,
        country,
        countryCode,
        pincode,

        phone,
        phoneCountryCode: "+91",

        whatsapp,
        whatsappCountryCode: "+91",

        alternatePhone,
        alternatePhoneCountryCode: "+91",

        landline,
        landlineCountryCode: "+91",

        website,
        description,
        foodType,

        services,
        serviceTypes,
        serviceCoverage,
        businessHours,
        location,

        seo: {
          title: seoMeta.title,
          description: seoMeta.description,
          keywords: seoMeta.keywords,
          h1: seoMeta.h1,
        },

        status: "approved",
        isVerified: true,
        isFeatured: false,
        boost: false,
      });

      // Track this newly created business for subsequent
      // rows in the same CSV import.
      for (const number of duplicateNumbers) {
        registerContact(number, {
          _id: business._id,
          name: business.name,
          phone: business.phone,
          alternatePhone: business.alternatePhone,
          landline: business.landline,
        });
      }

      createdCount += 1;

            results.push({
        row: rowNumber,
        status: "created",
        businessId: business._id,
        businessName: business.name,
        message: "Imported successfully.",
      });
    } catch (error) {
      failedCount += 1;

      console.error("[BULK IMPORT ROW ERROR]", {
        requestId,
        row: rowNumber,
        businessName: name,
        error: error.message,
      });

      results.push({
        row: rowNumber,
        status: "failed",
        businessName: name,
        message: error.message || "Import failed.",
      });
    }

    // LIVE PROGRESS: update after each processed row
    updateImportProgress(requestId, {
      processed: index + 1,
      created: createdCount,
      skipped: skippedCount,
      failed: failedCount,
      results: [...results],
      message: `Processed ${index + 1} of ${rows.length} rows`,
    });
  }

  // ------------------------------------------------
  // 5. Ping sitemap once after successful creations
  // ------------------------------------------------

  if (createdCount > 0) {
    try {
      await pingGoogleSitemap();
    } catch (error) {
      console.error("[BULK IMPORT SITEMAP ERROR]", {
        requestId,
        error: error.message,
      });
    }
  }

    updateImportProgress(requestId, {
    status: "completed",
    total: rows.length,
    processed: rows.length,
    created: createdCount,
    skipped: skippedCount,
    failed: failedCount,
    results: [...results],
    message:
      `Import finished: ${createdCount} created, ` +
      `${skippedCount} skipped, ${failedCount} failed.`,
  });

  // ------------------------------------------------
  // 6. Final response
  // ------------------------------------------------

  console.log("[BULK IMPORT END]", {
    time: new Date().toISOString(),
    requestId,
    totalRows: rows.length,
    createdCount,
    skippedCount,
    failedCount,
  });

  return res.status(200).json({
    success: failedCount === 0,

    message:
      `Import finished: ${createdCount} created, ` +
      `${skippedCount} skipped, ${failedCount} failed.`,

    summary: {
      totalRows: rows.length,
      created: createdCount,
      skipped: skippedCount,
      failed: failedCount,
    },

    results,
  });
});