import raw from "../../_data/distances.json";
import { CATEGORIES, isStale, validateDistances } from "../../scripts/lib/distances.mjs";
import type { HomeMicrosite } from "./homes/types";

/**
 * Typed view of _data/distances.json for the distance table and commute chart
 * (WorldEnterpriseGroup/mtcottages#25). The same validator as the CI gate runs
 * at build time, so a malformed file fails the build; a stale row (older than
 * 12 months) is flagged on the page and fails scripts/check-claims.mjs.
 */

export type DistanceCategory = "hospital" | "employer" | "campus" | "school" | "grocery" | "attraction" | "highway";

export const categoryLabel: Record<DistanceCategory, string> = {
  hospital: "Hospitals",
  employer: "Major employers",
  campus: "Colleges",
  school: "Schools",
  grocery: "Groceries",
  attraction: "Downtown and parks",
  highway: "Interstate",
};

export type DistanceOrigin = { id: string; label: string; kind: "address" | "town-centre" };

export type DistanceRow = {
  id: string;
  destination: string;
  name: string;
  label: string;
  note?: string;
  category: DistanceCategory;
  minutes: number;
  miles: number;
  method: string;
  sourceUrl: string;
  measured: string;
  stale: boolean;
};

export type DistanceGroup = { category: DistanceCategory; label: string; rows: DistanceRow[] };

export type HomeDistances = {
  origin: DistanceOrigin;
  groups: DistanceGroup[];
  /** Longest drive in the set, for a shared chart scale. */
  maxMinutes: number;
  /** Measurement dates in the set, oldest first. */
  dates: string[];
  staleCount: number;
};

const categoryOrder: readonly string[] = CATEGORIES;
const isCategory = (value: unknown): value is DistanceCategory => typeof value === "string" && categoryOrder.includes(value);

const problems = validateDistances(raw);
if (problems.length > 0) {
  throw new Error(`_data/distances.json is invalid:\n${problems.join("\n")}`);
}

const origins: Record<string, { label: string; kind: string }> = raw.origins;
const destinations: Record<string, { name: string; label: string; category: string; note?: string }> = raw.destinations;
const sources: Record<string, string> = raw.sources;
const microsites: Record<string, string> = raw.microsites;

/**
 * The measured drive times for one microsite, grouped by category in the
 * fixed category order and sorted by minutes within each group.
 * Throws when the microsite's origin does not match its published address
 * level: a street-address home must be measured from that approved address,
 * a town-level home from its town centre.
 */
export function distancesFor(home: HomeMicrosite, today: Date = new Date()): HomeDistances {
  const originId = microsites[home.id];
  const origin = originId ? origins[originId] : undefined;
  if (!originId || !origin) throw new Error(`_data/distances.json has no microsites entry for ${home.id}`);
  if (origin.kind !== "address" && origin.kind !== "town-centre") throw new Error(`origin ${originId} has kind ${origin.kind}`);
  if (home.address.kind === "street") {
    if (origin.kind !== "address" || !origin.label.includes(home.address.streetAddress)) {
      throw new Error(`${home.id}: drive times must be measured from its approved address ${home.address.streetAddress}, not ${originId}`);
    }
  } else if (origin.kind !== "town-centre") {
    throw new Error(`${home.id}: has no approved street address, so its drive times must come from a town centre, not ${originId}`);
  }

  const rows: DistanceRow[] = raw.rows
    .filter((row) => row.origin === originId)
    .map((row) => {
      const destination = destinations[row.destination];
      const sourceUrl = sources[row.source];
      if (!destination || !sourceUrl || !isCategory(destination.category)) {
        throw new Error(`row ${row.id} references a missing destination, source or category`);
      }
      return {
        id: row.id,
        destination: row.destination,
        name: destination.name,
        label: destination.label,
        note: destination.note,
        category: destination.category,
        minutes: row.minutes,
        miles: row.miles,
        method: row.method,
        sourceUrl,
        measured: row.measured,
        stale: isStale(row.measured, today),
      };
    });

  for (const row of rows.filter((item) => item.stale)) {
    console.warn(`[distances] ${row.id} was measured ${row.measured}, more than 12 months ago. Re-measure it.`);
  }

  const groups = CATEGORIES
    .map((category): DistanceGroup => ({
      category,
      label: categoryLabel[category],
      rows: rows.filter((row) => row.category === category).sort((a, b) => a.minutes - b.minutes || a.label.localeCompare(b.label)),
    }))
    .filter((group) => group.rows.length > 0);

  return {
    origin: { id: originId, label: origin.label, kind: origin.kind },
    groups,
    maxMinutes: Math.max(1, ...rows.map((row) => row.minutes)),
    dates: [...new Set(rows.map((row) => row.measured))].sort(),
    staleCount: rows.filter((row) => row.stale).length,
  };
}

/** "15 Nov 2026" from an ISO date, in UTC so the build machine's zone never shifts it. */
export const formatMeasured = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
