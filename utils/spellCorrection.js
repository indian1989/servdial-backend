// backend/utils/spellCorrection.js

import stringSimilarity from "string-similarity";

/* ================= DICTIONARY ================= */
// You can expand this anytime (VERY IMPORTANT)
const DICTIONARY = [
  "plumber",
  "electrician",
  "salon",
  "beauty parlour",
  "ac repair",
  "carpenter",
  "doctor",
  "hotel",
  "restaurant",
  "gym",
  "mobile repair",
  "bike repair",
  "tuition",
  "coaching",
  "painter",
  "cleaning service",
];

/* ================= HINGLISH NORMALIZATION ================= */
const HINGLISH_MAP = {
  "plumber wala": "plumber",
  "electric wala": "electrician",
  "light wala": "electrician",
  "ac wala": "ac repair",
  "saloon": "salon",
  "parlour": "beauty parlour",
  "doctor saab": "doctor",
};

/* ================= MAIN FUNCTION ================= */
export const correctQuery = (input = "") => {
  if (!input) return input;

  let query = input.toLowerCase().trim();

  // ✅ Hinglish full match
  if (HINGLISH_MAP[query]) {
    return HINGLISH_MAP[query];
  }

  const words = query.split(" ");

  const correctedWords = words.map((word) => {
    const match = stringSimilarity.findBestMatch(word, DICTIONARY);

    if (match.bestMatch.rating > 0.75) {
      return match.bestMatch.target;
    }

    return word;
  });

  return correctedWords.join(" ");
};