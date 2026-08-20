// backend/utils/categoryKeywords.js

/**
 * Generate search keywords dynamically from category name.
 *
 * No category names are hardcoded here.
 *
 * Examples:
 * "Carpenter"
 * → carpenter, carpenters, carpentry, carpenter service,
 *   carpenter services, carpenter provider, carpenter providers,
 *   carpenter company, carpenter companies
 *
 * "Pest Control"
 * → pest control, pest controls, pest control service,
 *   pest control services, pest control provider,
 *   pest control providers, pest control company,
 *   pest control companies
 */

const cleanText = (value = "") => {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[()]/g, "")
    .trim();
};


/* =========================================================
   BASIC PLURAL
========================================================= */

const pluralize = (word = "") => {
  if (!word) return "";

  const value = word.toLowerCase().trim();

  if (value.endsWith("ies")) {
    return value;
  }

  if (
    value.endsWith("s") ||
    value.endsWith("x") ||
    value.endsWith("z") ||
    value.endsWith("ch") ||
    value.endsWith("sh")
  ) {
    return `${value}es`;
  }

  if (
    value.endsWith("y") &&
    value.length > 1 &&
    !/[aeiou]y$/.test(value)
  ) {
    return `${value.slice(0, -1)}ies`;
  }

  return `${value}s`;
};


/* =========================================================
   BASIC SINGULAR
========================================================= */

const singularize = (word = "") => {
  if (!word) return "";

  const value = word.toLowerCase().trim();

  if (value.endsWith("ies") && value.length > 3) {
    return `${value.slice(0, -3)}y`;
  }

  if (
    value.endsWith("ches") ||
    value.endsWith("shes") ||
    value.endsWith("xes") ||
    value.endsWith("zes")
  ) {
    return value.slice(0, -2);
  }

  if (
    value.endsWith("ses") &&
    value.length > 3
  ) {
    return value.slice(0, -2);
  }

  if (
    value.endsWith("s") &&
    !value.endsWith("ss")
  ) {
    return value.slice(0, -1);
  }

  return value;
};


/* =========================================================
   NORMALIZE SYMBOLS
========================================================= */

const normalizePhrase = (value = "") => {
  return cleanText(value)
    .replace(/\s*&\s*/g, " and ")
    .replace(/\s+/g, " ")
    .trim();
};


/* =========================================================
   GENERATOR
========================================================= */

export const generateCategoryKeywords = ({
  name = "",
  slug = "",
} = {}) => {

  const originalName = cleanText(name);

  if (!originalName) {
    return [];
  }

  const keywords = new Set();

  const add = (value) => {
    const keyword = cleanText(value);

    if (
      keyword &&
      keyword.length >= 2
    ) {
      keywords.add(keyword);
    }
  };


  /* =======================================================
     BASE NAME
  ======================================================= */

  const base = normalizePhrase(originalName);

  add(originalName);
  add(base);


  /* =======================================================
     SLUG WORDS
  ======================================================= */

  if (slug) {

    const slugText = cleanText(slug)
      .replace(/-/g, " ")
      .replace(/\s+/g, " ");

    add(slugText);
  }


  /* =======================================================
     WORD INFORMATION
  ======================================================= */

  const words = base
    .split(" ")
    .filter(Boolean);

  const lastWord =
    words[words.length - 1] || "";

  const singularLast =
    singularize(lastWord);

  const pluralLast =
    pluralize(singularLast);


  /* =======================================================
     SINGULAR / PLURAL CATEGORY NAME
  ======================================================= */

  if (lastWord) {

    if (
      singularLast &&
      singularLast !== lastWord
    ) {
      const singularName = [
        ...words.slice(0, -1),
        singularLast,
      ].join(" ");

      add(singularName);
    }

    if (
      pluralLast &&
      pluralLast !== lastWord
    ) {
      const pluralName = [
        ...words.slice(0, -1),
        pluralLast,
      ].join(" ");

      add(pluralName);
    }
  }


  /* =======================================================
     SERVICE INTENT
  ======================================================= */

  add(`${base} service`);
  add(`${base} services`);

  add(`${base} provider`);
  add(`${base} providers`);

  add(`${base} company`);
  add(`${base} companies`);

  add(`${base} business`);
  add(`${base} businesses`);


  /* =======================================================
     SEARCH INTENT
  ======================================================= */

  add(`${base} near me`);
  add(`${base} in my area`);

  add(`local ${base}`);
  add(`local ${base} services`);

  add(`best ${base}`);
  add(`top ${base}`);


  /* =======================================================
     LAST WORD VARIATIONS
  ======================================================= */

  if (
    singularLast &&
    singularLast !== base
  ) {

    add(`${singularLast} service`);
    add(`${singularLast} services`);

    add(`${singularLast} provider`);
    add(`${singularLast} providers`);

    add(`${singularLast} company`);
    add(`${singularLast} companies`);
  }


  /* =======================================================
     CATEGORY-SPECIFIC WORD STRUCTURE
     
     Example:
     "Cosmetics & Imitation Jewellery Store"
     
     Generates useful partial search terms without
     hardcoding the category name.
  ======================================================= */

  if (words.length > 1) {

    for (let i = 0; i < words.length - 1; i++) {

      const phrase =
        words
          .slice(i)
          .join(" ");

      if (phrase.length >= 3) {

        add(phrase);
        add(`${phrase} service`);
        add(`${phrase} services`);
      }
    }
  }


  /* =======================================================
     CLEAN + LIMIT
     
     Avoid keyword stuffing.
  ======================================================= */

  return Array.from(keywords)
    .map((keyword) =>
      keyword
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ")
    )
    .filter(Boolean)
    .slice(0, 30);
};


export default generateCategoryKeywords;