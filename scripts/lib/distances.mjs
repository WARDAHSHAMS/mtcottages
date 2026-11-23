// Schema and freshness rules for _data/distances.json, the measured drive
// times behind every proximity claim (WorldEnterpriseGroup/mtcottages#25, #26),
// and the measured walking routes the town landing pages show (`walks`).
//
// One validator, three callers:
//   scripts/check-claims.mjs          the CI gate (GitLab site-check, GitHub static-checks)
//   scripts/tests/distances.test.mjs  unit tests (node --test scripts/tests/*.test.mjs)
//   src/data/distances.ts             the Astro loader re-checks the fields it renders
//
// validateDistances() never throws on bad data; it returns a list of messages.

/** The four owner-approved home addresses (CLAUDE.md). No other origin may be a street address. */
export const APPROVED_ADDRESSES = ["125 Frederick St", "200 Henrietta St", "2712 Broad St", "3113 Broad St"];

/** Destination categories, in the order the distance component shows them. */
export const CATEGORIES = ["hospital", "employer", "campus", "school", "grocery", "attraction", "highway"];

export const ORIGIN_KINDS = ["address", "town-centre"];
export const MAX_AGE_DAYS = 365;
export const METERS_PER_MILE = 1609.344;
/** Longest chart label that still fits beside its value at 390px. */
export const MAX_LABEL_LENGTH = 30;

const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Published minutes: OSRM free-flow seconds, rounded up. */
export const minutesFor = (seconds) => Math.ceil(seconds / 60);

/** Published miles: one decimal. */
export const milesFor = (meters) => Math.round((meters / METERS_PER_MILE) * 10) / 10;

/**
 * The time zone every `measured` stamp is written in: the homes' own (Marietta,
 * Parkersburg, Ravenswood). "Today" is read in the same zone, so a row stamped
 * late in the evening in Ohio is not "in the future" to a CI runner on UTC
 * (pipeline 148591, 01:39 ET; WorldEnterpriseGroup/mtcottages!61).
 */
export const MEASUREMENT_TIME_ZONE = "America/New_York";

const calendarFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: MEASUREMENT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
});

/**
 * The calendar date (YYYY-MM-DD) of an instant in MEASUREMENT_TIME_ZONE.
 * Stamp a new measurement with `calendarDate(new Date())`.
 * @param {Date} instant
 */
export function calendarDate(instant) {
  const parts = Object.fromEntries(calendarFormat.formatToParts(instant).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Midnight UTC of an ISO calendar date, or null when it is not a real date. */
function dayStart(isoDate) {
  if (typeof isoDate !== "string" || !ISO_DATE.test(isoDate)) return null;
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) return null;
  return date.getTime();
}

/**
 * Age of a measurement in whole calendar days at `today`, both read in
 * MEASUREMENT_TIME_ZONE, or null when `measured` is not an ISO calendar date.
 * Negative means the stamp is after today.
 * @param {unknown} measured
 * @param {Date} today
 */
export function ageInDays(measured, today) {
  const stamp = dayStart(measured);
  if (stamp === null) return null;
  const now = dayStart(calendarDate(today));
  if (now === null) throw new RangeError(`ageInDays: today is not a valid date (${String(today)})`);
  return Math.round((now - stamp) / DAY_MS);
}

/** True when a measurement is older than MAX_AGE_DAYS at `today`. */
export const isStale = (measured, today) => {
  const age = ageInDays(measured, today);
  return age !== null && age > MAX_AGE_DAYS;
};

const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value.trim().length > 0;
const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

/**
 * Validates the whole distances file.
 * @param {unknown} data parsed _data/distances.json
 * @param {{ today?: Date }} [options]
 * @returns {string[]} one message per problem; empty when the file is valid
 */
export function validateDistances(data, { today = new Date() } = {}) {
  const errors = [];
  if (!isObject(data)) return ["distances.json must be a JSON object"];

  for (const key of ["origins", "destinations", "sources", "homes", "microsites"]) {
    if (!isObject(data[key])) errors.push(`distances.json ${key} must be an object`);
  }
  if (!Array.isArray(data.rows)) errors.push("distances.json rows must be an array");
  if (errors.length > 0) return errors;

  const { origins, destinations, sources } = data;

  for (const [id, origin] of Object.entries(origins)) {
    const where = `origin ${id}`;
    if (!isObject(origin) || !isText(origin.label)) {
      errors.push(`${where}: needs a label`);
      continue;
    }
    if (!ORIGIN_KINDS.includes(origin.kind)) errors.push(`${where}: kind must be one of ${ORIGIN_KINDS.join(", ")}`);
    if (origin.kind === "address" && !APPROVED_ADDRESSES.some((street) => origin.label.includes(street))) {
      errors.push(`${where}: is a street address that is not owner-approved; only ${APPROVED_ADDRESSES.join(", ")}`);
    }
    if (origin.kind === "town-centre" && !/town centre/i.test(origin.label)) {
      errors.push(`${where}: must be labelled as a town centre`);
    }
    if (!isFiniteNumber(origin.lat) || !isFiniteNumber(origin.lng)) errors.push(`${where}: lat and lng must be numbers`);
  }

  for (const [id, destination] of Object.entries(destinations)) {
    const where = `destination ${id}`;
    if (!isObject(destination)) {
      errors.push(`${where}: must be an object`);
      continue;
    }
    if (!isText(destination.name)) errors.push(`${where}: needs a name`);
    if (!isText(destination.label)) errors.push(`${where}: needs a short chart label`);
    else if (destination.label.length > MAX_LABEL_LENGTH) errors.push(`${where}: label is longer than ${MAX_LABEL_LENGTH} characters`);
    if (!CATEGORIES.includes(destination.category)) errors.push(`${where}: category must be one of ${CATEGORIES.join(", ")}`);
  }

  for (const [id, url] of Object.entries(sources)) {
    if (typeof url !== "string" || !url.startsWith("https://")) errors.push(`source ${id}: must be an https URL`);
  }

  for (const [map, keyLabel] of [["homes", "home"], ["microsites", "microsite"]]) {
    for (const [id, originId] of Object.entries(data[map])) {
      if (!origins[originId]) errors.push(`${keyLabel} ${id}: unknown origin ${originId}`);
    }
  }

  checkRows(data.rows, "row", { origins, destinations, sources, today, errors });
  // Walking routes (town landing pages): the same shape and rules as the drive
  // rows, kept in their own list so a walk is never drawn in a drive table or chart.
  if (data.walks !== undefined) {
    if (Array.isArray(data.walks)) checkRows(data.walks, "walk", { origins, destinations, sources, today, errors });
    else errors.push("distances.json walks must be an array");
  }

  // Every microsite origin needs something to show.
  for (const [id, originId] of Object.entries(data.microsites)) {
    if (!data.rows.some((row) => isObject(row) && row.origin === originId)) errors.push(`microsite ${id}: origin ${originId} has no measured rows`);
  }

  return errors;
}

/**
 * Checks one list of measured routes (`rows` or `walks`), appending to `errors`.
 * @param {unknown[]} list
 * @param {"row" | "walk"} kind
 * @param {{ origins: Record<string, unknown>, destinations: Record<string, unknown>, sources: Record<string, unknown>, today: Date, errors: string[] }} context
 */
function checkRows(list, kind, { origins, destinations, sources, today, errors }) {
  const seen = new Set();
  for (const row of list) {
    if (!isObject(row)) {
      errors.push(`${kind}: must be an object`);
      continue;
    }
    const where = `${kind} ${row.id ?? "(no id)"}`;
    if (row.id !== `${row.origin}:${row.destination}`) errors.push(`${where}: id must be "<origin>:<destination>"`);
    if (seen.has(row.id)) errors.push(`${where}: duplicate id`);
    seen.add(row.id);
    if (!origins[row.origin]) errors.push(`${where}: unknown origin ${row.origin}`);
    else if (kind === "walk" && /** @type {{ kind?: string }} */ (origins[row.origin]).kind !== "address") {
      errors.push(`${where}: a walking route needs an approved street-address origin; a town centre is not where anyone lives`);
    }
    if (!destinations[row.destination]) errors.push(`${where}: unknown destination ${row.destination}`);
    if (!isText(row.method)) errors.push(`${where}: method is missing`);
    if (typeof row.source !== "string" || !Object.hasOwn(sources, row.source)) errors.push(`${where}: source ${row.source} is not listed under sources`);
    if (!isFiniteNumber(row.seconds) || !isFiniteNumber(row.meters) || row.seconds <= 0 || row.meters <= 0) {
      errors.push(`${where}: seconds and meters must be positive numbers`);
    } else {
      const minutes = minutesFor(row.seconds);
      const miles = milesFor(row.meters);
      if (row.minutes !== minutes) errors.push(`${where}: minutes ${row.minutes} should be ${minutes} (ceil of ${row.seconds} s)`);
      if (row.miles !== miles) errors.push(`${where}: miles ${row.miles} should be ${miles} (${row.meters} m)`);
    }
    const age = ageInDays(row.measured, today);
    if (age === null) errors.push(`${where}: measured must be an ISO date (YYYY-MM-DD)`);
    else if (age < 0) errors.push(`${where}: measured ${row.measured} is in the future`);
    else if (age > MAX_AGE_DAYS) errors.push(`${where}: measured ${row.measured} is older than 12 months; re-measure it`);
  }
}
