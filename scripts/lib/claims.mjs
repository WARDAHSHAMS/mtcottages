// Claims the 2026-11-15 fact-check found wrong (WorldEnterpriseGroup/mtcottages#26).
// Each must never return, in the inventory or on a built page.
//
// A claim reads "N min to X" or "X is N minutes away"; the patterns follow
// that grammar so the measured distance table (adjacent cells such as
// "4 min | 1 mi | Downtown Parkersburg") is not mistaken for prose. The table's
// own figures are checked against their measurements by ./distances.mjs.

const TO = String.raw`(?:'|’)?(?:\s*\([^)]{0,24}\))?\s+(?:drive\s+|walk\s+|away\s+)?(?:to|from)\s+(?:the\s+)?(?:WVU Medicine\s+)?`;

export const BANNED_CLAIMS = [
  { pattern: new RegExp(String.raw`\b(?:[0-9]|1[0-4])\s*min(?:ute)?s?${TO}Jackson General`, "i"), why: "Jackson General Hospital is in Ripley, about 16 minutes from Ravenswood" },
  { pattern: /Jackson General[^.]{0,40}\b(?:is|are|sits)\s+(?:only\s+|just\s+)?(?:[0-9]|1[0-4])\s*min/i, why: "Jackson General Hospital is in Ripley, about 16 minutes from Ravenswood" },
  { pattern: /Jackson General Hospital[^.]{0,40}\bin Ravenswood\b/i, why: "Jackson General Hospital is in Ripley, not Ravenswood" },
  { pattern: /walk(?:able|ing distance)[^.]{0,40}downtown (?:Marietta|Parkersburg)/i, why: "Frederick, Broad and Oak are 2.3 to 2.7 miles from downtown: a drive, not a walk" },
  { pattern: /(?:short|easy) walk to downtown/i, why: "no listed home is a short walk from downtown Marietta or Parkersburg" },
  { pattern: /steps from restaurants/i, why: "Oak Cottage is about 8 minutes from downtown Parkersburg by car" },
  { pattern: new RegExp(String.raw`\b[1-5]\s*min(?:ute)?s?${TO}Marietta Memorial`, "i"), why: "Marietta Memorial Hospital is about 11 minutes from Frederick Cottage" },
  { pattern: new RegExp(String.raw`\b[1-6]\s*min(?:ute)?s?${TO}downtown Parkersburg`, "i"), why: "Broad and Oak are about 7 to 8 minutes from downtown Parkersburg" },
  { pattern: /Multiple bathrooms/i, why: "bathroom counts are stated only as photographed, with confirm on inquiry" },
  { pattern: /Parkersburg(?:'|’)s north (?:side|end)/i, why: "Buck Cottage's neighbourhood is not verified (address not approved)" },
];

/**
 * Every banned claim found in `text`.
 * @param {string} text plain text (strip tags from HTML first)
 * @returns {{ match: string, why: string }[]}
 */
export function findBannedClaims(text) {
  const found = [];
  for (const { pattern, why } of BANNED_CLAIMS) {
    const match = text.match(pattern);
    if (match) found.push({ match: match[0], why });
  }
  return found;
}

/** Visible text of an HTML page, for scanning: tags become spaces, whitespace collapses. */
export const pageText = (markup) => markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
