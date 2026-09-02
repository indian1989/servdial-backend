// backend/utils/rankBusinesses.js

/**
 * =========================================================
 * 🌍 WORLDWIDE BUSINESS RANKING ENGINE
 * =========================================================
 *
 * RESPONSIBILITY:
 * - Normalize ranking signals
 * - Apply intent-aware ranking
 * - Rank businesses consistently
 * - Keep ranking independent from DB queries
 *
 * MUST NOT:
 * - Query database
 * - Resolve city/category
 * - Parse search query
 * - Modify business data
 *
 * RANKING SIGNALS:
 * - Rating
 * - Reviews
 * - Views
 * - Clicks
 * - Distance
 * - Trending
 * - Vector/Semantic relevance
 * - Featured status
 *
 * Designed for:
 * - Local search
 * - City search
 * - Worldwide directory search
 * - Nearby search
 * - Quality search
 * - Popular search
 * - Emergency search
 * - Future AI/vector ranking
 * =========================================================
 */


/* =========================================================
   🔢 HELPERS
========================================================= */

/**
 * Clamp number between 0 and 1.
 */
const clamp01 = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(1, number));
};


/**
 * Safe logarithmic normalization.
 *
 * Prevents huge view/review/click counts from dominating
 * the ranking.
 */
const logNormalize = (value, divisor = 5) => {
  const number = Number(value || 0);

  if (!Number.isFinite(number) || number <= 0) {
    return 0;
  }

  return clamp01(
    Math.log10(number + 1) / divisor
  );
};

// =========================================================
// 🔎 EXACT NAME MATCH
// =========================================================

const normalizeText = (value = "") => {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};

const getNameMatchScore = (business, context = {}) => {
  const query = normalizeText(
    context?.textSearch ||
    context?.rawQuery ||
    context?.query ||
    ""
  );

  const name = normalizeText(
    business?.name || ""
  );

  if (!query || !name) {
    return 0;
  }

  // 🥇 Exact business name
  if (name === query) {
    return 1;
  }

  // 🥈 Business name starts with query
  if (name.startsWith(query)) {
    return 0.85;
  }

  // 🥉 Business name contains complete query
  if (name.includes(query)) {
    return 0.70;
  }

  return 0;
};

// =========================================================
// 🔎 LEXICAL SEARCH RELEVANCE
// =========================================================

const getLexicalRelevanceScore = (
  business,
  context = {}
) => {
  const query = normalizeText(
    context?.textSearch ||
    context?.rawQuery ||
    context?.query ||
    ""
  );

  if (!query) {
    return 0;
  }

  const tokens = query
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (!tokens.length) {
    return 0;
  }

  const getFieldText = (value) => {
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          return [
            item?.name,
            item?.description,
          ]
            .filter(Boolean)
            .join(" ");
        })
        .join(" ");
    }

    return String(value || "");
  };

  const fields = {
    name: normalizeText(
      getFieldText(business?.name)
    ),

    services: normalizeText(
      getFieldText(business?.services)
    ),

    tags: normalizeText(
      getFieldText(business?.tags)
    ),

    keywords: normalizeText(
      getFieldText(business?.keywords)
    ),

    description: normalizeText(
      getFieldText(business?.description)
    ),

    category: normalizeText(
      getFieldText(business?.categorySlug)
    ),
  };

  let matchedTokens = 0;
  let weightedMatch = 0;
  let strongestFieldMatch = 0;

  for (const token of tokens) {
    let tokenWeight = 0;

    // 🥇 Business name
    if (fields.name.includes(token)) {
      tokenWeight = Math.max(
        tokenWeight,
        1.00
      );
    }

    // 🥈 Services
    if (fields.services.includes(token)) {
      tokenWeight = Math.max(
        tokenWeight,
        0.85
      );
    }

    // 🥉 Category
    if (fields.category.includes(token)) {
      tokenWeight = Math.max(
        tokenWeight,
        0.80
      );
    }

    // Keywords
    if (fields.keywords.includes(token)) {
      tokenWeight = Math.max(
        tokenWeight,
        0.65
      );
    }

    // Tags
    if (fields.tags.includes(token)) {
      tokenWeight = Math.max(
        tokenWeight,
        0.60
      );
    }

    // Description is intentionally weak.
    // Generic words like "expert", "best", etc.
    // must not create strong search relevance.
    if (fields.description.includes(token)) {
      tokenWeight = Math.max(
        tokenWeight,
        0.25
      );
    }

    if (tokenWeight > 0) {
      matchedTokens += 1;
      weightedMatch += tokenWeight;

      strongestFieldMatch =
        Math.max(
          strongestFieldMatch,
          tokenWeight
        );
    }
  }

  if (!matchedTokens) {
    return 0;
  }

  const tokenCoverage =
    matchedTokens / tokens.length;

  const averageMatch =
    weightedMatch / tokens.length;

  // =======================================================
  // 🎯 FULL QUERY COVERAGE
  // =======================================================

  if (tokenCoverage === 1) {
    return clamp01(
      (tokenCoverage * 0.60) +
      (averageMatch * 0.40)
    );
  }

  // =======================================================
  // 🎯 PARTIAL QUERY COVERAGE
  //
  // A single generic description match should remain weak.
  // A strong business-name/service/category match can still
  // be useful when only part of a multi-word query matches.
  // =======================================================

  if (tokens.length > 1) {

    // Strong field match:
    // e.g. "Expert Electricals"
    // matched against "Chourasia Electricals"
    if (
      strongestFieldMatch >= 0.80
    ) {
      return clamp01(
        strongestFieldMatch *
        tokenCoverage
      );
    }

    // Weak description-only partial match:
    // e.g. "expert" inside an unrelated description.
    if (
      strongestFieldMatch <= 0.25
    ) {
      return clamp01(
        strongestFieldMatch *
        tokenCoverage *
        0.50
      );
    }

    return clamp01(
      strongestFieldMatch *
      tokenCoverage *
      0.75
    );
  }

  // =======================================================
  // 🔹 SINGLE-TOKEN QUERY
  // =======================================================

  return clamp01(
    strongestFieldMatch
  );
};

/* =========================================================
   📊 SIGNAL NORMALIZATION
========================================================= */

const normalizeSignals = (business = {}) => {

  const rating = clamp01(
    Number(business.averageRating || 0) / 5
  );


  const reviews = logNormalize(
    business.reviewCount ??
    business.totalReviews ??
    business.reviewsCount ??
    0,
    3
  );


  const views = logNormalize(
    business.views || 0,
    5
  );


  const clicks = clamp01(
    business.clickScore ??
    business.clicksScore ??
    0
  );


  const distance = clamp01(
    business.distanceScore ??
    0
  );


  const trending = clamp01(
    business.trendingScore || 0
  );


  const vector = clamp01(
    business.vectorScore ??
    business.semanticScore ??
    0
  );


  const relevance = clamp01(
    business.relevanceScore ??
    business.searchScore ??
    0
  );


  const feature =
    business.isFeatured ? 1 : 0;


  const trusted =
    business.isTrustedPartner ? 1 : 0;


  const premium =
    business.isPremiumPartner ? 1 : 0;


  return {
    rating,
    reviews,
    views,
    clicks,
    distance,
    trending,
    vector,
    relevance,
    feature,
    trusted,
    premium,
  };
};


/* =========================================================
   🧠 INTENT NORMALIZATION
========================================================= */

const getIntentType = (context = {}) => {

  /**
   * parseSearchIntent returns:
   *
   * {
   *   sortBy,
   *   isNearMe,
   *   isEmergency,
   *   ...
   * }
   *
   * intentDetector returns:
   *
   * {
   *   type,
   *   score,
   *   scores
   * }
   */

  if (context?.sortBy) {
    return context.sortBy;
  }


  if (context?.intent?.type) {
    return context.intent.type;
  }


  if (typeof context?.intent === "string") {
    return context.intent;
  }


  return "default";
};


/* =========================================================
   ⚖️ BASE WEIGHTS
========================================================= */

const BASE_WEIGHTS = {
  rating: 0.22,
  reviews: 0.08,
  views: 0.10,
  clicks: 0.12,
  distance: 0.10,
  trending: 0.10,
  vector: 0.10,
  relevance: 0.08,
  feature: 0.04,
  trusted: 0.03,
  premium: 0.03,
};


/* =========================================================
   🎯 INTENT-AWARE WEIGHTS
========================================================= */

const getWeights = (context = {}) => {

  const weights = {
    ...BASE_WEIGHTS,
  };


  const intent =
    getIntentType(context);


  const isNearby =
  Boolean(
    context?.searchIntent?.isNearMe ||
    context?.isNearMe ||
    context?.parsed?.isNearMe ||
    context?.filters?.isNearMe
  );

const isEmergency =
  Boolean(
    context?.searchIntent?.isEmergency ||
    context?.isEmergency ||
    context?.parsed?.isEmergency ||
    context?.filters?.isEmergency ||
    intent === "emergency"
  );


  /* =======================================================
     ⭐ QUALITY / RATING
  ======================================================= */

  if (
    intent === "rating" ||
    intent === "quality"
  ) {
    weights.rating += 0.15;
    weights.reviews += 0.05;
    weights.feature -= 0.03;
    weights.premium -= 0.02;
  }


  /* =======================================================
     📈 POPULAR
  ======================================================= */

  if (
    intent === "popular" ||
    intent === "trending"
  ) {
    weights.views += 0.08;
    weights.clicks += 0.06;
    weights.trending += 0.08;
  }


  /* =======================================================
     📍 NEARBY
  ======================================================= */

  if (
    intent === "local" ||
    isNearby
  ) {
    weights.distance += 0.18;
    weights.rating += 0.04;
  }


  /* =======================================================
     🚨 EMERGENCY
  ======================================================= */

  if (isEmergency) {
    weights.distance += 0.20;
    weights.rating += 0.05;
    weights.relevance += 0.05;

    weights.premium -= 0.05;
    weights.feature -= 0.05;
  }


  /* =======================================================
     🔎 SEARCH RELEVANCE
  ======================================================= */

  if (
    context?.textSearch ||
    context?.rawQuery
  ) {
    weights.relevance += 0.08;
    weights.vector += 0.06;
  }


  return weights;
};


/* =========================================================
   🧮 SCORE
========================================================= */

const computeScore = (
  signals,
  context = {}
) => {

  const weights =
    getWeights(context);

  let score =
    signals.rating * weights.rating +
    signals.reviews * weights.reviews +
    signals.views * weights.views +
    signals.clicks * weights.clicks +
    signals.distance * weights.distance +
    signals.trending * weights.trending +
    signals.vector * weights.vector +
    signals.relevance * weights.relevance +
    signals.feature * weights.feature +
    signals.trusted * weights.trusted +
    signals.premium * weights.premium;

  return clamp01(score);
};


/* =========================================================
   📍 DISTANCE FALLBACK
========================================================= */

const prepareBusiness = (
  business,
  context
) => {

  const normalized =
    normalizeSignals(business);


  /**
   * If backend search provides actual distance,
   * convert it into a proximity score.
   *
   * Smaller distance = higher score.
   */
  if (
    business.distance != null &&
    Number.isFinite(Number(business.distance))
  ) {

    const maxDistance =
      Number(
        context?.filters?.distance ||
        context?.distance ||
        10
      );


    if (maxDistance > 0) {

      normalized.distance =
        clamp01(
          1 -
          Number(business.distance) /
          maxDistance
        );

    }

  }


  return normalized;
};


/* =========================================================
   🚀 MAIN RANKER
========================================================= */

export const rankBusinesses = (
  businesses = [],
  context = {}
) => {

  if (!Array.isArray(businesses)) {
    return [];
  }


  const enriched =
    businesses
      .filter(Boolean)
      .map((business) => {

        try {

          const signals =
            prepareBusiness(
              business,
              context
            );


          const baseScore =
  computeScore(
    signals,
    context
  );

const nameMatch =
  getNameMatchScore(
    business,
    context
  );

const lexicalRelevance =
  getLexicalRelevanceScore(
    business,
    context
  );

let finalScore =
  baseScore;

// =====================================================
// 🥇 EXACT NAME MATCH PRIORITY
// =====================================================

if (nameMatch === 1) {
  finalScore = 0.98;
}

// =====================================================
// 🥈 STRONG NAME MATCH
// =====================================================

else if (nameMatch > 0) {
  finalScore =
    Math.max(
      finalScore,
      0.82 + (nameMatch * 0.08)
    );
}

// =====================================================
// 🥉 LEXICAL RELEVANCE
// =====================================================

else if (lexicalRelevance > 0) {
  finalScore =
    Math.max(
      finalScore,
      lexicalRelevance * 0.78
    );
}

          return {
            ...business,

            /**
             * Internal ranking score.
             */
            finalScore:
              Number(
                finalScore.toFixed(6)
              ),

            /**
             * Optional debug information.
             *
             * Can be removed from API response later if required.
             */
            _ranking: {
  rating: signals.rating,
  reviews: signals.reviews,
  views: signals.views,
  clicks: signals.clicks,
  distance: signals.distance,
  trending: signals.trending,
  vector: signals.vector,
  relevance: signals.relevance,
  feature: signals.feature,
  trusted: signals.trusted,
  premium: signals.premium,
  nameMatch,
  lexicalRelevance,
},
          };

        } catch (error) {

          console.error(
            "🔥 BUSINESS RANKING ERROR:",
            error.message
          );


          return {
            ...business,
            finalScore: 0,
          };

        }

      });


  /* =======================================================
     🏆 SORT
  ======================================================= */

  return enriched.sort(
    (a, b) => {

      const scoreDifference =
        (b.finalScore || 0) -
        (a.finalScore || 0);


      if (scoreDifference !== 0) {
        return scoreDifference;
      }


      /**
       * Tie breaker #1:
       * Higher rating.
       */
      const ratingDifference =
        Number(b.averageRating || 0) -
        Number(a.averageRating || 0);


      if (ratingDifference !== 0) {
        return ratingDifference;
      }


      /**
       * Tie breaker #2:
       * More reviews.
       */
      const reviewDifference =
        Number(
          b.reviewCount ??
          b.totalReviews ??
          0
        ) -
        Number(
          a.reviewCount ??
          a.totalReviews ??
          0
        );


      if (reviewDifference !== 0) {
        return reviewDifference;
      }


      /**
       * Tie breaker #3:
       * More views.
       */
      return (
        Number(b.views || 0) -
        Number(a.views || 0)
      );

    }
  );
};


/* =========================================================
   🔍 OPTIONAL DEBUG EXPORT
========================================================= */

export const getBusinessRankingSignals = (
  business = {},
  context = {}
) => {

  const signals =
    prepareBusiness(
      business,
      context
    );


  return {
    signals,

    weights:
      getWeights(context),

    finalScore:
      computeScore(
        signals,
        context
      ),
  };
};