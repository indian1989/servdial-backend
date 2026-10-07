// backend/services/geocodeService.js

import axios from "axios";

const API_KEY = process.env.OPENCAGE_API_KEY;
const OPENCAGE_URL =
  "https://api.opencagedata.com/geocode/v1/json";

/*
=================================================
 NORMALIZE TEXT
=================================================
*/

const normalizeText = (value = "") => {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/*
=================================================
 TOKENIZE
=================================================
*/

const tokenize = (value = "") => {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
};

/*
=================================================
 QUERY HELPERS
=================================================
*/

const dedupeParts = (parts = []) => {
  const seen = new Set();
  const output = [];

  for (const part of parts) {
    const value = String(part || "").trim();
    const key = normalizeText(value);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(value);
  }

  return output;
};

const buildQuery = (parts = []) => {
  return dedupeParts(parts).join(", ");
};

const genericTypes = new Set([
  "country",
  "continent",
  "state",
  "region",
  "state_district",
  "county",
  "city",
  "postal_city",
  "postcode",
  "partial_postcode",
  "terminated_postcode",
  "fictitious",
]);

/*
=================================================
 GENERIC BUSINESS WORDS
=================================================

 These are removed only from the
 "distinctive business name" calculation.
 They are NOT category restrictions.
*/

const genericBusinessWords = new Set([
  "school",
  "college",
  "university",
  "hospital",
  "clinic",
  "pharmacy",
  "restaurant",
  "hotel",
  "cafe",
  "salon",
  "studio",
  "shop",
  "store",
  "service",
  "services",
  "center",
  "centre",
  "institute",
  "academy",
  "office",
  "agency",
]);

const getDistrictPart = (
  district,
  city
) => {
  if (!district) {
    return "";
  }

  return normalizeText(district) !==
    normalizeText(city)
    ? district
    : "";
};

/*
=================================================
 OPENCAGE RATE LIMIT + QUEUE
=================================================

 Free-trial users are limited to 1 request/sec.
 Requests are serialized so multiple users do
 not create overlapping OpenCage requests.
=================================================
*/

const OPENCAGE_MIN_INTERVAL_MS = 1100;

let lastOpenCageRequestTime = 0;
let openCageQueue = Promise.resolve();

const waitForOpenCageSlot = async () => {
  const elapsed =
    Date.now() -
    lastOpenCageRequestTime;

  if (
    elapsed <
    OPENCAGE_MIN_INTERVAL_MS
  ) {
    await new Promise((resolve) =>
      setTimeout(
        resolve,
        OPENCAGE_MIN_INTERVAL_MS -
          elapsed
      )
    );
  }
};

const queueOpenCageRequest = async (
  query,
  extraParams = {}
) => {
  const task =
    openCageQueue.then(async () => {
      await waitForOpenCageSlot();

      lastOpenCageRequestTime =
        Date.now();

      const params = {
        q: query,
        key: API_KEY,
        language: "en",
        countrycode: "in",
        limit: 5,
        no_annotations: 1,
        ...extraParams,
      };

      try {
        const response =
          await axios.get(
            OPENCAGE_URL,
            {
              params,
              timeout: 15000,
            }
          );

        return (
          response.data?.results || []
        );
      } catch (error) {
        if (
          error.response?.status === 429
        ) {
          console.warn(
            "⚠️ OPENCAGE 429 — retrying once after delay"
          );

          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                2200
              )
          );

          lastOpenCageRequestTime =
            Date.now();

          const retryResponse =
            await axios.get(
              OPENCAGE_URL,
              {
                params,
                timeout: 15000,
              }
            );

          return (
            retryResponse.data
              ?.results || []
          );
        }

        throw error;
      }
    });

  openCageQueue =
    task.catch(() => undefined);

  return task;
};

/*
=================================================
 SHORT-LIVED SUCCESS CACHE
=================================================
*/

const GEOCODE_CACHE_TTL_MS =
  10 * 60 * 1000;

const geocodeCache =
  new Map();

const makeCacheKey = ({
  businessName,
  address,
  city,
  district,
  state,
  country,
  pincode,
}) => {
  const addressText =
    typeof address === "object"
      ? [
          address?.street,
          address?.area,
          address?.landmark,
        ]
          .filter(Boolean)
          .join(", ")
      : String(address || "");

  return JSON.stringify(
    [
      businessName,
      addressText,
      city,
      district,
      state,
      country,
      pincode,
    ].map((value) =>
      normalizeText(value)
    )
  );
};

const getCachedResult = (
  key
) => {
  const cached =
    geocodeCache.get(key);

  if (!cached) {
    return undefined;
  }

  if (
    Date.now() -
      cached.timestamp >
    GEOCODE_CACHE_TTL_MS
  ) {
    geocodeCache.delete(key);
    return undefined;
  }

  console.log(
    "♻️ GEOCODE CACHE HIT"
  );

  return cached.value;
};

const setCachedResult = (
  key,
  value
) => {
  geocodeCache.set(
    key,
    {
      timestamp: Date.now(),
      value,
    }
  );
};

/*
=================================================
 RESULT HELPERS
=================================================
*/

const getResultType = (
  result = {}
) => {
  return normalizeText(
    result.components?._type ||
      "unknown"
  );
};

const getComponentText = (
  components = {}
) => {
  return Object.values(
    components
  )
    .flatMap((value) => {
      if (Array.isArray(value)) {
        return value;
      }

      if (
        typeof value === "string" ||
        typeof value === "number"
      ) {
        return [value];
      }

      return [];
    })
    .filter(Boolean)
    .join(" ");
};

const getResultText = (
  result = {}
) => {
  const components =
    result.components || {};

  return [
    result.formatted,
    result.name,
    getComponentText(
      components
    ),
  ]
    .filter(Boolean)
    .join(" ");
};

const getFoundCity = (
  components = {}
) => {
  return normalizeText(
    components._normalized_city ||
      components.city ||
      components.town ||
      components.village ||
      components.municipality ||
      components.city_district ||
      ""
  );
};

const getFoundState = (
  components = {}
) => {
  return normalizeText(
    components.state ||
      components.region ||
      ""
  );
};

const getFoundPincode = (
  components = {}
) => {
  return components.postcode
    ? String(
        components.postcode
      ).replace(/\D/g, "")
    : "";
};

/*
=================================================
 LOCATION SPECIFICITY
=================================================

 This is geographic specificity only.

 No city, state or business-category
 hardcoding.
=================================================
*/

const getLocationTypeScore = (
  type = ""
) => {
  switch (
    normalizeText(type)
  ) {
    case "building":
    case "house":
    case "address":
      return 80;

    case "commercial":
    case "office":
    case "shop":
      return 70;

    case "road":
      return 55;

    case "place":
      return 35;

    case "neighbourhood":
    case "suburb":
      return 25;

    case "hamlet":
      return 20;

    /*
    ---------------------------------------------
    POSTCODE FALLBACK
    ---------------------------------------------
    Postcode is NOT treated as an exact
    business location.

    It is allowed only as the final fallback
    when no road / building / POI result exists.
    ---------------------------------------------
    */
    case "postcode":
    case "partial_postcode":
    case "terminated_postcode":
      return 10;

    default:
      return 0;
  }
};

/*
=================================================
 BUSINESS NAME MATCH
=================================================
*/

const getBusinessNameMatch = ({
  businessName,
  result,
  city,
  district,
  state,
  country,
  pincode,
}) => {
  if (!businessName) {
    return {
      matchedTokens: 0,
      totalTokens: 0,
      ratio: 0,
      exactPhrase: false,
      score: 0,
    };
  }

  const resultText =
    normalizeText(
      getResultText(result)
    );

  if (!resultText) {
    return {
      matchedTokens: 0,
      totalTokens: 0,
      ratio: 0,
      exactPhrase: false,
      score: 0,
    };
  }

  /*
  -----------------------------------------------
  REMOVE LOCATION TOKENS FROM BUSINESS NAME
  -----------------------------------------------
  */

  const locationTokens =
    new Set([
      ...tokenize(city),
      ...tokenize(district),
      ...tokenize(state),
      ...tokenize(
        country || "India"
      ),
      ...(pincode
        ? [
            String(pincode).replace(
              /\D/g,
              ""
            ),
          ]
        : []),
    ]);

  const allNameTokens = [
    ...new Set(
      tokenize(businessName)
    ),
  ];

  const distinctiveTokens =
    allNameTokens.filter(
      (token) =>
        !locationTokens.has(
          token
        ) &&
        !genericBusinessWords.has(
          token
        )
    );

  const matchedTokens =
    distinctiveTokens.filter(
      (token) =>
        resultText.includes(token)
    ).length;

  const ratio =
    distinctiveTokens.length
      ? matchedTokens /
        distinctiveTokens.length
      : 0;

  const normalizedName =
    normalizeText(
      businessName
    );

  const exactPhrase =
    normalizedName.length >= 4 &&
    resultText.includes(
      normalizedName
    );

  let score =
    matchedTokens * 25;

  if (
    ratio >= 0.8 &&
    distinctiveTokens.length >= 2
  ) {
    score += 25;
  }

  if (exactPhrase) {
    score += 60;
  }

  return {
    matchedTokens,
    totalTokens:
      distinctiveTokens.length,
    ratio,
    exactPhrase,
    score,
  };
};

/*
=================================================
 ADDRESS FIELD MATCH
=================================================
*/

const getFieldTokenMatch = (
  inputValue,
  resultText
) => {
  const tokens =
    tokenize(inputValue);

  if (!tokens.length) {
    return 0;
  }

  const matched =
    tokens.filter(
      (token) =>
        resultText.includes(
          token
        )
    ).length;

  return Math.min(
    20,
    matched * 4
  );
};

/*
=================================================
LANDMARK TARGET EXTRACTION
=================================================

Example:

"near PMCH and Patna University Campus"

becomes:

[
  "PMCH",
  "Patna University Campus"
]

=================================================
*/

const extractLandmarkTargets = (
  landmark = ""
) => {
  const cleaned =
    String(landmark || "")
      .replace(
        /\b(?:near|nearby|close\s+to|next\s+to|beside|opposite|in\s+front\s+of)\b/gi,
        " "
      )
      .replace(/\s+/g, " ")
      .trim();

  if (!cleaned) {
    return [];
  }

  const parts =
    cleaned
      .split(/\s+(?:and|&)\s+|[,;|]+/i)
      .map((part) =>
        part.trim()
      )
      .filter(
        (part) =>
          part.length >= 2
      );

  return [
    ...new Set(parts),
  ];
};

/*
=================================================
LANDMARK TARGET MATCH
=================================================
*/

const getLandmarkTargetScore = (
  landmarkTarget,
  result = {}
) => {
  if (!landmarkTarget) {
    return 0;
  }

  const expected =
    normalizeText(
      landmarkTarget
    );

  const resultText =
    normalizeText(
      getResultText(result)
    );

  if (
    !expected ||
    !resultText
  ) {
    return 0;
  }

  const tokens =
    tokenize(
      landmarkTarget
    );

  const matchedTokens =
    tokens.filter(
      (token) =>
        resultText.includes(
          token
        )
    ).length;

  let score = Math.min(
    20,
    matchedTokens * 5
  );

  /*
  Exact landmark phrase
  */

  if (
    expected.length >= 4 &&
    resultText.includes(
      expected
    )
  ) {
    score += 60;
  }
  /*
  All landmark tokens found
  */
  else if (
    tokens.length >= 2 &&
    matchedTokens ===
      tokens.length
  ) {
    score += 40;
  }

  return Math.min(
    80,
    score
  );
};

const getRoadScore = (
  street,
  components = {}
) => {
  if (
    !street ||
    !components.road
  ) {
    return 0;
  }

  const expected =
    normalizeText(street);

  const found =
    normalizeText(
      components.road
    );

  if (
    !expected ||
    !found
  ) {
    return 0;
  }

  if (
    expected === found
  ) {
    return 45;
  }

  if (
    found.includes(expected) ||
    expected.includes(found)
  ) {
    return 30;
  }

  return getFieldTokenMatch(
    street,
    found
  );
};


/*
=================================================
 CANDIDATE SCORING
=================================================
*/

const scoreCandidate = ({
  result,
  businessName,
  street,
  area,
  landmark,
  city,
  district,
  state,
  country,
  pincode,
  queryKind,
}) => {
  const components =
    result.components || {};

  const type =
    getResultType(result);

  const resultText =
    normalizeText(
      getResultText(result)
    );

  /*
  -----------------------------------------------
  COUNTRY
  -----------------------------------------------
  */

  if (
    components.country_code &&
    normalizeText(
      components.country_code
    ) !== "in"
  ) {
    return null;
  }

  /*
  -----------------------------------------------
  CITY
  -----------------------------------------------
  */

  const expectedCity =
    normalizeText(city);

  const foundCity =
    getFoundCity(
      components
    );

  if (
    expectedCity &&
    foundCity &&
    !foundCity.includes(
      expectedCity
    ) &&
    !expectedCity.includes(
      foundCity
    )
  ) {
    return null;
  }

  /*
  -----------------------------------------------
  STATE
  -----------------------------------------------
  */

  const expectedState =
    normalizeText(state);

  const foundState =
    getFoundState(
      components
    );

  if (
    expectedState &&
    foundState &&
    !foundState.includes(
      expectedState
    ) &&
    !expectedState.includes(
      foundState
    )
  ) {
    return null;
  }

  /*
  -----------------------------------------------
  PINCODE
  -----------------------------------------------
  */

  const expectedPincode =
    pincode
      ? String(pincode).replace(
          /\D/g,
          ""
        )
      : "";

  const foundPincode =
    getFoundPincode(
      components
    );

  /*
-----------------------------------------------
PINCODE MATCH
-----------------------------------------------

Normal address/business searches:
pincode mismatch = reject

Landmark searches:
pincode mismatch = allow

Landmark ka pincode business pincode se
different ho sakta hai.
-----------------------------------------------
*/

if (
  expectedPincode &&
  foundPincode &&
  expectedPincode !==
    foundPincode &&
  queryKind !== "landmark"
) {
  return null;
}

  /*
  -----------------------------------------------
  BUSINESS NAME
  -----------------------------------------------
  */

  const nameMatch =
    getBusinessNameMatch({
      businessName,
      result,
      city,
      district,
      state,
      country,
      pincode,
    });

  /*
  -----------------------------------------------
  LOCATION MATCH
  -----------------------------------------------
  */

  const cityScore =
    expectedCity &&
    foundCity
      ? 15
      : 0;

  const stateScore =
    expectedState &&
    foundState
      ? 10
      : 0;

  const pincodeScore =
    expectedPincode &&
    foundPincode &&
    expectedPincode ===
      foundPincode
      ? 20
      : 0;

  const streetScore =
    getRoadScore(
      street,
      components
    );

  const areaScore =
    getFieldTokenMatch(
      area,
      resultText
    );

  const landmarkScore =
    getFieldTokenMatch(
      landmark,
      resultText
    );

  const addressTextScore =
    Math.min(
      25,
      getFieldTokenMatch(
        street,
        resultText
      ) +
        getFieldTokenMatch(
          area,
          resultText
        ) +
        getFieldTokenMatch(
          landmark,
          resultText
        )
    );

  const locationTypeScore =
    getLocationTypeScore(
      type
    );

  const confidence =
    Number(
      result.confidence
    );

  const confidenceScore =
    Number.isFinite(
      confidence
    )
      ? Math.min(
          confidence * 2,
          20
        )
      : 0;

  const queryKindScore =
    queryKind === "business"
      ? 10
      : queryKind === "address"
      ? 5
      : 0;

  const totalScore =
    nameMatch.score +
    streetScore +
    areaScore +
    landmarkScore +
    addressTextScore +
    cityScore +
    stateScore +
    pincodeScore +
    locationTypeScore +
    confidenceScore +
    queryKindScore;

  return {
    result,
    totalScore,
    details: {
      queryKind,

      businessNameMatch:
        nameMatch.matchedTokens,

      businessNameTotalTokens:
        nameMatch.totalTokens,

      businessNameRatio:
        nameMatch.ratio,

      businessNameExactPhrase:
        nameMatch.exactPhrase,

      businessNameScore:
        nameMatch.score,

      streetScore,
      areaScore,
      landmarkScore,
      addressTextScore,
      cityScore,
      stateScore,
      pincodeScore,
      locationTypeScore,
      confidenceScore,
    },
  };
};

/*
=================================================
 STRONG BUSINESS POI
=================================================
*/

const isStrongBusinessMatch = (
  item
) => {
  if (!item) {
    return false;
  }

  const type =
    getResultType(
      item.result
    );

  const typeScore =
    getLocationTypeScore(
      type
    );

  const nameMatched =
    item.details
      .businessNameExactPhrase ||
    item.details
      .businessNameMatch >= 2 ||
    (
      item.details
        .businessNameMatch >= 1 &&
      item.details
        .businessNameRatio >= 0.5
    );

  return (
    nameMatched &&
    !genericTypes.has(type) &&
    typeScore >= 35
  );
};

/*
=================================================
 DEDUPE CANDIDATES
=================================================
*/

const dedupeScoredResults = (
  items = []
) => {
  const byCoordinate =
    new Map();

  for (const item of items) {
    const lat =
      Number(
        item.result.geometry?.lat
      );

    const lng =
      Number(
        item.result.geometry?.lng
      );

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      continue;
    }

    const key =
      `${lat.toFixed(
        6
      )}:${lng.toFixed(
        6
      )}`;

    const existing =
      byCoordinate.get(key);

    if (
      !existing ||
      item.totalScore >
        existing.totalScore
    ) {
      byCoordinate.set(
        key,
        item
      );
    }
  }

  return [
    ...byCoordinate.values(),
  ];
};

/*
=================================================
 DEBUG RESULTS
=================================================
*/

const logResults = (
  label,
  results = []
) => {
  console.log(
    `🔎 OPENCAGE ${label}:`
  );

  results.forEach(
    (result, index) => {
      const components =
        result.components || {};

      console.log(
        `#${index + 1}`,
        {
          formatted:
            result.formatted,

          confidence:
            result.confidence,

          type:
            components._type,

          category:
            components._category,

          road:
            components.road,

          houseNumber:
            components.house_number,

          neighbourhood:
            components.neighbourhood,

          suburb:
            components.suburb,

          city:
            components.city ||
            components.town ||
            components.village ||
            components.municipality,

          postcode:
            components.postcode,

          state:
            components.state,

          coordinates:
            result.geometry,
        }
      );
    }
  );
};

/*
=================================================
 BUSINESS ADDRESS GEOCODE
=================================================
*/

export const geocodeAddress =
  async ({
    businessName,
    address,
    city,
    district,
    state,
    country,
    pincode,
  }) => {
    try {
      if (!API_KEY) {
        console.log(
          "❌ OPENCAGE KEY MISSING"
        );

        return null;
      }

      /*
      =============================================
      CACHE
      =============================================
      */

      const cacheKey =
        makeCacheKey({
          businessName,
          address,
          city,
          district,
          state,
          country,
          pincode,
        });

      const cached =
        getCachedResult(
          cacheKey
        );

      if (
        cached !== undefined
      ) {
        return cached;
      }

      /*
      =============================================
      ADDRESS OBJECT
      =============================================
      */

      const street =
        typeof address ===
        "object"
          ? address?.street ||
            ""
          : String(
              address || ""
            );

      const area =
        typeof address ===
        "object"
          ? address?.area ||
            ""
          : "";

      const landmark =
        typeof address ===
        "object"
          ? address?.landmark ||
            ""
          : "";

      const districtPart =
        getDistrictPart(
          district,
          city
        );

  /*
=================================================
 QUERY PLAN
=================================================

 Generic progressive search for all ServDial
 businesses, cities, districts and states.

 The business name is used for POI/name lookup.
 Address searches use actual address fields.

 Pincode is kept as a later fallback signal,
 not the primary search anchor.
=================================================
*/

const queryPlan = [];

/*
---------------------------------------------
QUERY 1: BUSINESS / POI NAME
---------------------------------------------
*/

if (businessName) {
  const businessQuery = buildQuery([
    businessName,
    city,
    districtPart,
    state,
  ]);

  if (businessQuery) {
    queryPlan.push({
      label: "BUSINESS NAME",
      query: businessQuery,
      queryKind: "business",
      params: {},
    });
  }
}

/*
---------------------------------------------
QUERY 2: FULL ADDRESS
---------------------------------------------
*/

const fullAddressQuery = buildQuery([
  street,
  area,
  landmark,
  city,
  districtPart,
  state,
]);

if (fullAddressQuery) {
  queryPlan.push({
    label: "FULL ADDRESS",
    query: fullAddressQuery,
    queryKind: "address",
    params: {},
  });
}

/*
---------------------------------------------
QUERY 3: STREET + AREA
---------------------------------------------
*/

const streetAreaQuery = buildQuery([
  street,
  area,
  city,
  districtPart,
  state,
]);

if (
  streetAreaQuery &&
  normalizeText(streetAreaQuery) !==
    normalizeText(fullAddressQuery)
) {
  queryPlan.push({
    label: "STREET + AREA",
    query: streetAreaQuery,
    queryKind: "address",
    params: {},
  });
}

/*
---------------------------------------------
QUERY 4: AREA + LANDMARK
---------------------------------------------
*/

const areaLandmarkQuery = buildQuery([
  area,
  landmark,
  city,
  districtPart,
  state,
]);

if (
  areaLandmarkQuery &&
  normalizeText(areaLandmarkQuery) !==
    normalizeText(fullAddressQuery) &&
  normalizeText(areaLandmarkQuery) !==
    normalizeText(streetAreaQuery)
) {
  queryPlan.push({
    label: "AREA + LANDMARK",
    query: areaLandmarkQuery,
    queryKind: "address",
    params: {},
  });
}

/*
---------------------------------------------
QUERY 5: STREET ONLY
---------------------------------------------
*/

const streetQuery = buildQuery([
  street,
  city,
  districtPart,
  state,
]);

if (
  streetQuery &&
  normalizeText(streetQuery) !==
    normalizeText(fullAddressQuery) &&
  normalizeText(streetQuery) !==
    normalizeText(streetAreaQuery)
) {
  queryPlan.push({
    label: "STREET",
    query: streetQuery,
    queryKind: "road",
    params: {
      roadinfo: 1,
    },
  });
}

/*
---------------------------------------------
QUERY 6: LANDMARK ONLY
---------------------------------------------
*/

const landmarkQuery = buildQuery([
  landmark,
  city,
  districtPart,
  state,
]);

if (
  landmarkQuery &&
  normalizeText(landmarkQuery) !==
    normalizeText(areaLandmarkQuery) &&
  normalizeText(landmarkQuery) !==
    normalizeText(fullAddressQuery)
) {
  queryPlan.push({
    label: "LANDMARK",
    query: landmarkQuery,
    queryKind: "address",
    params: {},
  });
}

/*
---------------------------------------------
QUERY 7: STREET + PINCODE
---------------------------------------------
*/

const streetPincodeQuery =
  buildQuery([
    street,
    pincode,
    city,
    districtPart,
    state,
  ]);

if (
  streetPincodeQuery &&
  normalizeText(
    streetPincodeQuery
  ) !== normalizeText(
    streetQuery
  )
) {
  queryPlan.push({
    label: "STREET + PINCODE",
    query: streetPincodeQuery,
    queryKind: "postcode",
    params: {},
  });
}

/*
---------------------------------------------
QUERY 8: AREA + PINCODE
---------------------------------------------
*/

const areaPincodeQuery =
  buildQuery([
    area,
    pincode,
    city,
    districtPart,
    state,
  ]);

if (
  areaPincodeQuery &&
  normalizeText(
    areaPincodeQuery
  ) !== normalizeText(
    streetPincodeQuery
  )
) {
  queryPlan.push({
    label: "AREA + PINCODE",
    query: areaPincodeQuery,
    queryKind: "postcode",
    params: {},
  });
}

/*
---------------------------------------------
QUERY 9: LANDMARK + PINCODE
---------------------------------------------
*/

const landmarkPincodeQuery =
  buildQuery([
    landmark,
    pincode,
    city,
    districtPart,
    state,
  ]);

if (
  landmarkPincodeQuery &&
  normalizeText(
    landmarkPincodeQuery
  ) !== normalizeText(
    areaPincodeQuery
  )
) {
  queryPlan.push({
    label: "LANDMARK + PINCODE",
    query: landmarkPincodeQuery,
    queryKind: "postcode",
    params: {},
  });
}

/*
---------------------------------------------
QUERY 10: PINCODE + CITY
---------------------------------------------
*/

const pincodeQuery =
  buildQuery([
    pincode,
    city,
    districtPart,
    state,
  ]);

if (
  pincodeQuery &&
  normalizeText(
    pincodeQuery
  ) !== normalizeText(
    streetPincodeQuery
  ) &&
  normalizeText(
    pincodeQuery
  ) !== normalizeText(
    areaPincodeQuery
  )
) {
  queryPlan.push({
    label: "PINCODE",
    query: pincodeQuery,
    queryKind: "postcode",
    params: {},
  });
}

/*
---------------------------------------------
FINAL DEBUG
---------------------------------------------
*/

console.log(
  "🔥 GEOCODE QUERY PLAN:",
  queryPlan.map(
    (item) => ({
      label: item.label,
      query: item.query,
      queryKind: item.queryKind,
    })
  )
);

      let scoredResults =
        [];

      let strongBusinessResult =
        null;

      let searchProximity = null;

      /*
      =============================================
      RUN QUERY PLAN
      =============================================
      */

      for (
        const plan of queryPlan
      ) {
        if (!plan.query) {
          continue;
        }

        console.log(
          `🔥 OPENCAGE ${plan.label} QUERY:`,
          plan.query
        );

        let results = [];

        try {
          const requestParams = {
  ...(plan.params || {}),
};

if (searchProximity) {
  requestParams.proximity =
    `${searchProximity.lat},${searchProximity.lng}`;
}

results = await queueOpenCageRequest(
  plan.query,
  requestParams
);
        } catch (
          error
        ) {
          console.error(
            `❌ OPENCAGE ${plan.label} FAILED:`,
            error.response
              ?.data ||
              error.message
          );

          continue;
        }

        if (
          !results.length
        ) {
          console.log(
            `⚠️ OPENCAGE ${plan.label}: NO RESULT`
          );

          continue;
        }

        logResults(
          plan.label,
          results
        );

        for (
          const result of results
        ) {
          const scored =
            scoreCandidate({
              result,
              businessName,
              street,
              area,
              landmark,
              city,
              district,
              state,
              country,
              pincode,
              queryKind:
                plan.queryKind,
            });

          if (!scored) {
            continue;
          }

          scoredResults.push(
            scored
          );
        }

        const currentScored =
          dedupeScoredResults(
            scoredResults
          ).sort(
            (a, b) =>
              b.totalScore -
              a.totalScore
          );

        /*
        -----------------------------------------
        STRONG BUSINESS POI
        -----------------------------------------
        */

        if (
          businessName
        ) {
          strongBusinessResult =
            currentScored.find(
              isStrongBusinessMatch
            ) || null;
        }

        if (
          strongBusinessResult
        ) {
          console.log(
            "✅ STRONG BUSINESS POI FOUND — STOPPING SEARCH"
          );

          break;
        }
      }

      /*
      =============================================
      SPECIFIC RESULT CHECK
      =============================================
      */

      const currentSpecificResults =
        dedupeScoredResults(
          scoredResults
        ).filter(
          (item) => {
            const type =
              getResultType(
                item.result
              );

            return (
              !genericTypes.has(
                type
              ) &&
              getLocationTypeScore(
                type
              ) >= 35
            );
          }
        );

      /*
      =============================================
      ROAD FALLBACK
      =============================================

      Only run if no sufficiently specific
      building/address/road/POI result exists.
      */

      if (
        !strongBusinessResult &&
        !currentSpecificResults.length &&
        street
      ) {
        const roadQuery =
          buildQuery([
            street,
            city,
            districtPart,
            state,
          ]);

        console.log(
          "🛣️ OPENCAGE ROAD FALLBACK QUERY:",
          roadQuery
        );

        try {
          const roadResults =
            await queueOpenCageRequest(
              roadQuery,
              {
                roadinfo: 1,
              }
            );

          if (
            roadResults.length
          ) {
            logResults(
              "ROAD FALLBACK",
              roadResults
            );

            /*
---------------------------------------------
CITY RESULT AS SEARCH BIAS ONLY
---------------------------------------------

A city result can help OpenCage narrow
later searches, but it is NEVER saved
as business coordinates.
*/

for (const result of roadResults) {
  const type =
    getResultType(result);

  if (
    type === "city" ||
    type === "postal_city" ||
    type === "town"
  ) {
    const lat =
      Number(
        result.geometry?.lat
      );

    const lng =
      Number(
        result.geometry?.lng
      );

    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      !searchProximity
    ) {
      searchProximity = {
        lat,
        lng,
      };

      console.log(
        "📍 CITY RESULT SAVED AS SEARCH PROXIMITY ONLY:",
        searchProximity
      );

      break;
    }
  }
}

            for (
              const result of
                roadResults
            ) {
              const scored =
                scoreCandidate({
                  result,
                  businessName,
                  street,
                  area,
                  landmark,
                  city,
                  district,
                  state,
                  country,
                  pincode,
                  queryKind:
                    "road",
                });

              if (!scored) {
                continue;
              }

              scoredResults.push(
                scored
              );
            }
          }
        } catch (
          error
        ) {
          console.error(
            "❌ OPENCAGE ROAD FALLBACK FAILED:",
            error.response
              ?.data ||
              error.message
          );
        }
      }

      /*
      =============================================
      FINAL RANKING
      =============================================
      */

      const finalCandidates =
        dedupeScoredResults(
          scoredResults
        ).sort(
          (a, b) =>
            b.totalScore -
            a.totalScore
        );

      console.log(
        "🏆 FINAL GEOCODE RANKING:"
      );

      finalCandidates.forEach(
        (item, index) => {
          console.log(
            `#${index + 1}`,
            {
              score:
                item.totalScore,

              formatted:
                item.result
                  .formatted,

              confidence:
                item.result
                  .confidence,

              type:
                item.result
                  .components
                  ?._type,

              coordinates:
                item.result
                  .geometry,

              details:
                item.details,
            }
          );
        }
      );

 /*
=================================================
LANDMARK REFINEMENT
=================================================

Landmark ko combined sentence ki tarah search
nahi kiya jayega.

Example:

"near PMCH and Patna University Campus"

will be searched as:

1. PMCH
2. Patna University Campus

Pincode sirf geographic anchor hai.
Final landmark result ka pincode same hona
zaroori nahi hai.

=================================================
*/

let landmarkCandidates = [];

if (landmark) {

  /*
  ---------------------------------------------
  EXTRACT LANDMARK TARGETS
  ---------------------------------------------
  */

  const landmarkTargets =
    extractLandmarkTargets(
      landmark
    );

  console.log(
    "🎯 LANDMARK TARGETS:",
    landmarkTargets
  );

  /*
  ---------------------------------------------
  FIND POSTCODE GEO ANCHOR
  ---------------------------------------------
  */

  const expectedPincode =
    pincode
      ? String(pincode).replace(
          /\D/g,
          ""
        )
      : "";

  const postcodeAnchor =
    finalCandidates
      .filter((item) => {

        const type =
          getResultType(
            item.result
          );

        const postcodeType =
          type === "postcode" ||
          type ===
            "partial_postcode" ||
          type ===
            "terminated_postcode";

        if (!postcodeType) {
          return false;
        }

        const foundPincode =
          getFoundPincode(
            item.result
              .components || {}
          );

        return (
          expectedPincode &&
          foundPincode ===
            expectedPincode
        );
      })
      .sort(
        (a, b) =>
          b.totalScore -
          a.totalScore
      )[0] || null;

  /*
  ---------------------------------------------
  SEARCH EACH LANDMARK
  ---------------------------------------------
  */

  for (
    const landmarkTarget
    of landmarkTargets
  ) {

    /*
    -------------------------------------------
    QUERY A
    DIRECT LANDMARK
    -------------------------------------------
    */

    const directLandmarkQuery =
      buildQuery([
        landmarkTarget,
        city,
        districtPart,
        state,
      ]);

    /*
    -------------------------------------------
    QUERY B
    LANDMARK + ADDRESS CONTEXT
    -------------------------------------------
    */

    const contextLandmarkQuery =
      buildQuery([
        landmarkTarget,
        street,
        area,
        city,
        districtPart,
        state,
      ]);

    const landmarkQueries = [
      directLandmarkQuery,
    ];

    if (
      contextLandmarkQuery &&
      normalizeText(
        contextLandmarkQuery
      ) !==
        normalizeText(
          directLandmarkQuery
        )
    ) {
      landmarkQueries.push(
        contextLandmarkQuery
      );
    }

    for (
      const landmarkQuery
      of landmarkQueries
    ) {

      if (!landmarkQuery) {
        continue;
      }

      console.log(
        "🎯 LANDMARK TARGET QUERY:",
        landmarkQuery
      );

      try {

        const landmarkRequestParams =
          {};

        /*
        ---------------------------------------
        USE POSTCODE AS PROXIMITY ONLY
        ---------------------------------------
        */

        if (
          postcodeAnchor &&
          Number.isFinite(
            Number(
              postcodeAnchor.result
                .geometry?.lat
            )
          ) &&
          Number.isFinite(
            Number(
              postcodeAnchor.result
                .geometry?.lng
            )
          )
        ) {

          landmarkRequestParams.proximity =
            `${Number(
              postcodeAnchor.result
                .geometry.lat
            )},${Number(
              postcodeAnchor.result
                .geometry.lng
            )}`;

          console.log(
            "📍 LANDMARK SEARCH PROXIMITY:",
            landmarkRequestParams
              .proximity
          );
        }

        const results =
          await queueOpenCageRequest(
            landmarkQuery,
            landmarkRequestParams
          );

        if (!results.length) {
          console.log(
            "⚠️ LANDMARK TARGET: NO RESULT",
            landmarkTarget
          );
          continue;
        }

        logResults(
          `LANDMARK TARGET: ${landmarkTarget}`,
          results
        );

        /*
        ---------------------------------------
        SCORE RESULTS
        ---------------------------------------
        */

        for (
          const result
          of results
        ) {

          const type =
            getResultType(
              result
            );

          /*
          Never use city/postcode as landmark.
          */

          if (
            type === "city" ||
            type ===
              "postal_city" ||
            type === "state" ||
            type === "region" ||
            type === "postcode" ||
            type ===
              "partial_postcode" ||
            type ===
              "terminated_postcode"
          ) {
            continue;
          }

          const scored =
            scoreCandidate({
              result,
              businessName,
              street,
              area,

              /*
              IMPORTANT:
              Score the individual landmark,
              not the complete "near A and B".
              */

              landmark:
                landmarkTarget,

              city,
              district,
              state,
              country,
              pincode,

              queryKind:
                "landmark",
            });

          if (!scored) {
            continue;
          }

          const landmarkTargetScore =
            getLandmarkTargetScore(
              landmarkTarget,
              result
            );

          scored.details
            .landmarkTarget =
            landmarkTarget;

          scored.details
            .landmarkTargetScore =
            landmarkTargetScore;

          scored.totalScore +=
            landmarkTargetScore;

          landmarkCandidates.push(
            scored
          );
        }

      } catch (error) {

        console.error(
          `❌ LANDMARK TARGET FAILED: ${landmarkTarget}`,
          error.response
            ?.data ||
            error.message
        );
      }
    }
  }
}

/*
=================================================
DEDUPE + SORT
=================================================
*/

landmarkCandidates =
  dedupeScoredResults(
    landmarkCandidates
  ).sort(
    (a, b) =>
      b.totalScore -
      a.totalScore
  );

console.log(
  "🎯 LANDMARK CANDIDATES:"
);

landmarkCandidates.forEach(
  (item, index) => {

    console.log(
      `#${index + 1}`,
      {
        score:
          item.totalScore,

        landmarkTarget:
          item.details
            .landmarkTarget,

        landmarkTargetScore:
          item.details
            .landmarkTargetScore,

        type:
          item.result
            .components?._type,

        formatted:
          item.result
            .formatted,

        road:
          item.result
            .components?.road,

        postcode:
          item.result
            .components?.postcode,

        coordinates:
          item.result
            .geometry,
      }
    );
  }
);

/*
=================================================
STRONG LANDMARK
=================================================
*/

const strongLandmarkResult =
  landmarkCandidates.find(
    (item) => {

      const type =
        getResultType(
          item.result
        );

      const landmarkScore =
        Number(
          item.details
            .landmarkTargetScore ||
            0
        );

      return (
        !genericTypes.has(
          type
        ) &&
        landmarkScore >= 35
      );
    }
  ) || null;

if (
  strongLandmarkResult
) {

  console.log(
    "✅ EXACT / STRONG LANDMARK FOUND"
  );

  console.log({
    landmarkTarget:
      strongLandmarkResult
        .details
        .landmarkTarget,

    formatted:
      strongLandmarkResult
        .result
        .formatted,

    type:
      getResultType(
        strongLandmarkResult
          .result
      ),

    coordinates:
      strongLandmarkResult
        .result
        .geometry,

    score:
      strongLandmarkResult
        .totalScore,
  });
}

      /*
=============================================
FINAL LOCATION SELECTION
=============================================
Priority:

1. Exact / strong business POI
2. Building / house / address
3. Commercial / office / shop
4. Road
5. Place / neighbourhood / suburb
6. Exact matching postcode fallback

IMPORTANT:
- City result is NEVER accepted.
- Random same-pincode POI is NEVER used as postcode fallback.
- Postcode fallback must match the user's input pincode exactly.
=============================================
*/

/*
---------------------------------------------
1. SPECIFIC LOCATION CANDIDATES
---------------------------------------------
*/

const specificCandidates =
  finalCandidates
    .filter((item) => {
      const type = getResultType(
        item.result
      );

      return (
        !genericTypes.has(type) &&
        getLocationTypeScore(type) >= 20
      );
    })
    .sort((a, b) => {
      const typeA =
        getLocationTypeScore(
          getResultType(a.result)
        );

      const typeB =
        getLocationTypeScore(
          getResultType(b.result)
        );

      if (typeB !== typeA) {
        return typeB - typeA;
      }

      return (
        b.totalScore -
        a.totalScore
      );
    });

/*
---------------------------------------------
2. EXACT MATCHING POSTCODE CANDIDATES
---------------------------------------------
*/

const expectedPincode =
  pincode
    ? String(pincode).replace(
        /\D/g,
        ""
      )
    : "";

const postcodeCandidates =
  finalCandidates.filter(
    (item) => {
      const type =
        getResultType(
          item.result
        );

      const isPostcodeType =
        type === "postcode" ||
        type ===
          "partial_postcode" ||
        type ===
          "terminated_postcode";

      if (!isPostcodeType) {
        return false;
      }

      const foundPincode =
        getFoundPincode(
          item.result.components || {}
        );

      return (
        expectedPincode &&
        foundPincode ===
          expectedPincode
      );
    }
  );

/*
---------------------------------------------
3. SELECT STRONG BUSINESS RESULT FIRST
---------------------------------------------
*/

let selected =
  strongBusinessResult ||
  strongLandmarkResult ||
  null;

/*
---------------------------------------------
4. OTHERWISE BEST SPECIFIC LOCATION
---------------------------------------------
*/

if (!selected) {

  selected =
    landmarkCandidates[0] ||
    specificCandidates[0] ||
    null;
}

/*
---------------------------------------------
5. EXACT POSTCODE FALLBACK
---------------------------------------------
*/

if (
  !selected &&
  postcodeCandidates.length
) {
  selected =
    postcodeCandidates[0];

  console.log(
    "📍 EXACT POSTCODE FALLBACK SELECTED"
  );

  console.log({
    inputPincode:
      expectedPincode,
    matchedPincode:
      getFoundPincode(
        selected.result.components ||
          {}
      ),
    formatted:
      selected.result.formatted,
    coordinates:
      selected.result.geometry,
    score:
      selected.totalScore,
    details:
      selected.details,
  });
}

/*
---------------------------------------------
6. NO VALID RESULT
---------------------------------------------
*/

if (!selected) {
  console.log(
    "❌ NO VALID BUSINESS / ROAD / POSTCODE LOCATION FOUND"
  );

  console.log(
    "❌ CITY CENTER RESULT REJECTED"
  );

  return null;
}

/*
---------------------------------------------
FINAL COORDINATES
---------------------------------------------
*/

const latitude =
  Number(
    selected.result
      .geometry?.lat
  );

const longitude =
  Number(
    selected.result
      .geometry?.lng
  );

if (
  !Number.isFinite(
    latitude
  ) ||
  !Number.isFinite(
    longitude
  )
) {
  console.log(
    "❌ INVALID FINAL COORDINATES"
  );

  return null;
}

const components =
  selected.result
    .components || {};

const selectedType =
  getResultType(
    selected.result
  );

/*
---------------------------------------------
POSTCODE FALLBACK DEBUG
---------------------------------------------
*/

if (
  selectedType === "postcode" ||
  selectedType === "partial_postcode" ||
  selectedType === "terminated_postcode"
) {
  console.log(
    "📍 POSTCODE FALLBACK SELECTED"
  );

  console.log({
    postcode:
      components.postcode,

    formatted:
      selected.result
        .formatted,

    coordinates:
      selected.result
        .geometry,

    score:
      selected.totalScore,

    details:
      selected.details,
  });
} else {
  console.log(
    "✅ SPECIFIC LOCATION SELECTED"
  );

  console.log({
    formatted:
      selected.result
        .formatted,

    type:
      selectedType,

    confidence:
      selected.result
        .confidence,

    score:
      selected.totalScore,

    details:
      selected.details,

    coordinates:
      selected.result
        .geometry,
  });
}

/*
---------------------------------------------
FINAL LOCATION
---------------------------------------------
*/

const location = {
  type: "Point",

  coordinates: [
    longitude,
    latitude,
  ],
};

const finalResult = {
  latitude,
  longitude,
  location,
};

/*
---------------------------------------------
CACHE SUCCESSFUL RESULT
---------------------------------------------
*/

setCachedResult(
  cacheKey,
  finalResult
);

console.log(
  "📍 FINAL BUSINESS GEO:",
  location.coordinates
);

return finalResult;
    } catch (
      error
    ) {
      console.error(
        "❌ GEOCODING FAILED:",
        error.response
          ?.data ||
          error.message
      );

      return null;
    }
  };