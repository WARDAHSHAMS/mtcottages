// Schema for src/data/terms.json (WorldEnterpriseGroup/mtcottages#72), shared by
// the Astro loader (src/data/terms.ts) and the unit tests, so the build and CI
// reject the same mistakes: an unconfirmed number, a value with no source, or an
// open question that names no row in notes/owner-decisions.md.

/** The six terms every home carries, in display order. */
export const TERM_FIELDS = ["monthlyRate", "deposit", "minimumStay", "utilities", "pets", "availableFrom"];

/** Which statuses each field may use. Only the monthly rate has a published guide. */
export const ALLOWED_STATUSES = {
  monthlyRate: ["confirmed", "guide", "confirm"],
  deposit: ["confirmed", "confirm"],
  minimumStay: ["confirmed", "listed", "confirm"],
  utilities: ["confirmed", "listed", "confirm"],
  pets: ["confirmed", "listed", "confirm"],
  availableFrom: ["confirmed", "confirm"],
};

/** Value type per field: whole US dollars, an ISO date, or short text. */
export const VALUE_KIND = {
  monthlyRate: "dollars",
  deposit: "dollars",
  minimumStay: "text",
  utilities: "text",
  pets: "text",
  availableFrom: "date",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ASK_ID = /^[A-Z]*\d+$/;
const MAX_TEXT = 80;

export function isIsoDate(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Row ids from the tables in notes/owner-decisions.md: the first cell of each
 * row, such as "1", "V2" or "T1". A range cell such as "B3-B6" yields both ends.
 */
export function decisionIds(markdown) {
  const ids = new Set();
  for (const match of String(markdown).matchAll(/^\|\s*([A-Z]*\d+)(?:-([A-Z]*\d+))?\s*\|/gm)) {
    ids.add(match[1]);
    if (match[2]) ids.add(match[2]);
  }
  return ids;
}

const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

function validateEntry(where, field, entry, decisions) {
  const errors = [];
  if (!isObject(entry)) return [`${where}: must be an object`];
  const allowedKeys = new Set(["status", "value", "source", "ask", "note"]);
  for (const key of Object.keys(entry)) {
    if (!allowedKeys.has(key)) errors.push(`${where}: unknown key "${key}"`);
  }
  const { status } = entry;
  if (!ALLOWED_STATUSES[field].includes(status)) {
    errors.push(`${where}: status must be one of ${ALLOWED_STATUSES[field].join(", ")}, not ${JSON.stringify(status)}`);
    return errors;
  }

  if (status === "confirmed" || status === "listed") {
    const kind = VALUE_KIND[field];
    if (kind === "dollars" && !(Number.isInteger(entry.value) && entry.value > 0)) errors.push(`${where}: value must be a whole number of dollars`);
    if (kind === "date" && !isIsoDate(entry.value)) errors.push(`${where}: value must be an ISO date (YYYY-MM-DD)`);
    if (kind === "text" && !(typeof entry.value === "string" && entry.value.trim() && entry.value.length <= MAX_TEXT)) errors.push(`${where}: value must be text of 1 to ${MAX_TEXT} characters`);
    if (typeof entry.source !== "string" || !entry.source.trim()) errors.push(`${where}: a ${status} value needs a source`);
    if ("ask" in entry) errors.push(`${where}: a ${status} value has no open question ("ask")`);
    if ("note" in entry) errors.push(`${where}: a ${status} value takes no note`);
  } else {
    if ("value" in entry) errors.push(`${where}: a ${status} entry must not carry a value`);
    if ("source" in entry) errors.push(`${where}: a ${status} entry takes no source`);
  }

  if (status === "confirm") {
    if (typeof entry.ask !== "string" || !ASK_ID.test(entry.ask)) {
      errors.push(`${where}: "ask" must name a row in notes/owner-decisions.md, such as "2" or "T1"`);
    } else if (decisions && !decisions.has(entry.ask)) {
      errors.push(`${where}: notes/owner-decisions.md has no row ${entry.ask}`);
    }
    if ("note" in entry && !(typeof entry.note === "string" && entry.note.trim() && entry.note.length <= MAX_TEXT && !/\d/.test(entry.note))) {
      errors.push(`${where}: a note must be short text with no numbers (an unconfirmed figure never reaches the page)`);
    }
  } else if (status === "guide" && ("ask" in entry || "note" in entry)) {
    errors.push(`${where}: a guide entry takes no ask or note`);
  }
  return errors;
}

/**
 * Validates the parsed terms file. Pass `homeIds` to require an entry for
 * every home and `decisions` (from decisionIds) to check each open question.
 * Returns a list of problems; empty means valid.
 */
export function validateTerms(data, { homeIds, decisions } = {}) {
  if (!isObject(data) || !isObject(data.homes)) return ["terms: expected an object with a \"homes\" object"];
  const errors = [];
  for (const [id, terms] of Object.entries(data.homes)) {
    if (!/^[a-z][a-z0-9-]*$/.test(id)) errors.push(`homes.${id}: id must be a lowercase home id`);
    if (!isObject(terms)) {
      errors.push(`homes.${id}: must be an object`);
      continue;
    }
    for (const key of Object.keys(terms)) {
      if (!TERM_FIELDS.includes(key)) errors.push(`homes.${id}: unknown field "${key}"`);
    }
    for (const field of TERM_FIELDS) {
      if (!(field in terms)) errors.push(`homes.${id}.${field}: missing`);
      else errors.push(...validateEntry(`homes.${id}.${field}`, field, terms[field], decisions));
    }
  }
  for (const id of homeIds ?? []) {
    if (!(id in data.homes)) errors.push(`homes.${id}: missing (every home needs its terms)`);
  }
  return errors;
}
