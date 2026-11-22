// Schema for src/data/reviews.json (WorldEnterpriseGroup/mtcottages#61), shared by
// the Astro loader (src/data/reviews.ts) and the unit tests, so the build and CI
// reject the same mistakes. A review is published only with the guest's written
// consent, shows only a first name and a hometown, and carries no contact
// detail, link or street address. The consent message itself stays with ops;
// git keeps only its date, channel and an opaque reference. The rules for
// asking and publishing are in docs/marketing/reviews.md.

export const SOURCES = ["direct", "google"];
export const CONSENT_CHANNELS = ["email", "text"];

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FIRST_NAME = /^\p{Lu}[\p{L}'’-]{0,23}$/u;
const HOMETOWN = /^\p{L}[\p{L} .'’-]{1,39}, [A-Z]{2}$/u;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RECORD = /^[A-Za-z0-9._:-]{3,60}$/;
const MIN_TEXT = 20;
const MAX_TEXT = 700;

/** Things a published review must never contain. */
const LEAKS = [
  [/[\w.+-]+@[\w-]+\.[\w.]+/, "an email address"],
  [/https?:\/\/|www\./i, "a link"],
  [/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/, "a phone number"],
  [/\b\d{1,5}\s+(?:[\p{L}.]+\s+){1,3}(?:st|street|ave|avenue|rd|road|dr|drive|blvd|boulevard|ln|lane|ct|court|pike|way|pl|place)\b/iu, "a street address"],
];

export function isIsoDate(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

function unknownKeys(where, value, allowed) {
  return Object.keys(value).filter((key) => !allowed.includes(key)).map((key) => `${where}: unknown key "${key}"`);
}

function validateReview(where, review, { homeIds, today }) {
  if (!isObject(review)) return [`${where}: must be an object`];
  const errors = unknownKeys(where, review, ["id", "home", "firstName", "hometown", "stayEnded", "text", "source", "consent", "published"]);
  if (typeof review.id !== "string" || !ID.test(review.id)) errors.push(`${where}: id must be lower-case words joined by hyphens`);
  if (homeIds && !homeIds.includes(review.home)) errors.push(`${where}: home ${JSON.stringify(review.home)} is not a listed home (${homeIds.join(", ")})`);
  if (typeof review.firstName !== "string" || !FIRST_NAME.test(review.firstName)) {
    errors.push(`${where}: firstName must be one capitalised first name, with no surname or initial`);
  }
  if (typeof review.hometown !== "string" || !HOMETOWN.test(review.hometown)) {
    errors.push(`${where}: hometown must be "Town, ST" (a town and a two-letter state), with no street or number`);
  }
  if (typeof review.stayEnded !== "string" || !MONTH.test(review.stayEnded)) errors.push(`${where}: stayEnded must be a month (YYYY-MM)`);
  if (!SOURCES.includes(review.source)) errors.push(`${where}: source must be one of ${SOURCES.join(", ")}`);

  if (typeof review.text !== "string" || review.text.trim().length < MIN_TEXT || review.text.length > MAX_TEXT) {
    errors.push(`${where}: text must be the guest's words, ${MIN_TEXT} to ${MAX_TEXT} characters`);
  } else {
    if (review.text !== review.text.trim()) errors.push(`${where}: text has leading or trailing space`);
    for (const [pattern, what] of LEAKS) if (pattern.test(review.text)) errors.push(`${where}: text contains ${what}; ask the guest before removing it, or leave the review out`);
  }

  if (!isObject(review.consent)) {
    errors.push(`${where}: consent is required (date, channel, record); a review without written consent is never published`);
  } else {
    const consent = review.consent;
    errors.push(...unknownKeys(`${where}.consent`, consent, ["date", "channel", "record"]));
    if (!isIsoDate(consent.date)) errors.push(`${where}.consent: date must be an ISO date (YYYY-MM-DD)`);
    if (!CONSENT_CHANNELS.includes(consent.channel)) errors.push(`${where}.consent: channel must be one of ${CONSENT_CHANNELS.join(", ")}`);
    if (typeof consent.record !== "string" || !RECORD.test(consent.record)) {
      errors.push(`${where}.consent: record must be the opaque ops reference (3 to 60 letters, digits, . _ : -), never the guest's contact`);
    }
  }

  if (!isIsoDate(review.published)) {
    errors.push(`${where}: published must be an ISO date (YYYY-MM-DD)`);
  } else {
    const todayIso = today.toISOString().slice(0, 10);
    if (review.published > todayIso) errors.push(`${where}: published ${review.published} is in the future`);
    if (isObject(review.consent) && isIsoDate(review.consent.date) && review.consent.date > review.published) {
      errors.push(`${where}: published ${review.published} is before consent was given (${review.consent.date})`);
    }
    if (typeof review.stayEnded === "string" && MONTH.test(review.stayEnded) && review.stayEnded > review.published.slice(0, 7)) {
      errors.push(`${where}: the stay ended (${review.stayEnded}) after the review was published`);
    }
  }
  if (isObject(review.consent) && isIsoDate(review.consent.date) && typeof review.stayEnded === "string" && MONTH.test(review.stayEnded)
    && review.consent.date.slice(0, 7) < review.stayEnded) {
    errors.push(`${where}.consent: consent (${review.consent.date}) is dated before the stay ended (${review.stayEnded})`);
  }
  return errors;
}

/**
 * Returns every problem in a reviews file; an empty list means it is valid.
 * options.homeIds: the listed home ids (src/data/site.ts); options.today: the build date.
 */
export function validateReviews(data, options = {}) {
  const { homeIds, today = new Date() } = options;
  if (!isObject(data)) return ["reviews.json must be an object with a reviews list"];
  const errors = unknownKeys("reviews.json", data, ["reviews"]);
  if (!Array.isArray(data.reviews)) return [...errors, "reviews.json: reviews must be a list (empty until a guest consents)"];
  const seen = new Set();
  data.reviews.forEach((review, index) => {
    const where = `reviews[${index}]${isObject(review) && typeof review.id === "string" ? ` (${review.id})` : ""}`;
    errors.push(...validateReview(where, review, { homeIds, today }));
    if (isObject(review) && typeof review.id === "string") {
      if (seen.has(review.id)) errors.push(`${where}: id is used twice`);
      seen.add(review.id);
    }
  });
  return errors;
}
