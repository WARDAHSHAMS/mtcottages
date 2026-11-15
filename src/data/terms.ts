import raw from "./terms.json";
import { TERM_FIELDS, validateTerms, type TermField } from "../../scripts/lib/terms.mjs";
import { cottages, publishedLuxuryFurnishedRates, type CottageBedroomLabel } from "./site";
import type { FactStatus, HomeMicrosite } from "./homes/types";

/**
 * Rates and terms for every home (WorldEnterpriseGroup/mtcottages#72), read
 * from src/data/terms.json. The microsite block, the cottage cards, the
 * property pages and the Offer structured data all come from here, so changing
 * one field in the JSON changes every place it shows. An unconfirmed value is
 * never rendered: the page says "Confirm on inquiry".
 */

type ValueEntry = { status: "confirmed" | "listed"; value: string | number; source: string };
type GuideEntry = { status: "guide" };
type ConfirmEntry = { status: "confirm"; ask: string; note?: string };
type TermEntry = ValueEntry | GuideEntry | ConfirmEntry;
type HomeTerms = Record<TermField, TermEntry>;

export type TermRow = {
  field: TermField;
  label: string;
  /** What the page shows; null when the value is not confirmed. */
  value: string | null;
  /** The badge: "listed" for a published guide or listing value. */
  status: FactStatus;
  /** One line under the value: where a guide comes from, or a confirm note. */
  note?: string;
};

export type CardTerms = { rate: string; available: string; minimumStay: string | null };

const problems = validateTerms(raw, { homeIds: cottages.map((cottage) => cottage.id) });
if (problems.length > 0) {
  throw new Error(`src/data/terms.json is invalid:\n${problems.join("\n")}`);
}

// The JSON import is typed loosely (status: string); validateTerms has just
// checked every entry against the field rules, so the narrower type holds.
const allTerms = raw.homes as unknown as Record<string, HomeTerms>;

export const termLabel: Record<TermField, string> = {
  monthlyRate: "Monthly rate",
  deposit: "Security deposit",
  minimumStay: "Minimum stay",
  utilities: "Utilities",
  pets: "Pets",
  availableFrom: "Available from",
};

/** Facts that used to live in each home's facts list; the terms block owns them now. */
const termFactLabels = /^(monthly (guide|rate)|rate|price|security deposit|deposit|minimum stay|utilities|pets|availability|available from)$/i;

const bedroomWords: Record<CottageBedroomLabel, string> = {
  "1 Bedroom": "one-bedroom",
  "2 Bedrooms": "two-bedroom",
  "3 Bedrooms": "three-bedroom",
};

const dollars = (value: number) => `$${value.toLocaleString("en-US")}`;

/** "December 1, 2026" from an ISO date, in UTC so the build machine's zone never shifts it. */
export const formatDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

const isPastOrToday = (iso: string, today: Date) => iso <= today.toISOString().slice(0, 10);

function termsOf(id: string): HomeTerms {
  const terms = allTerms[id];
  if (!terms) throw new Error(`src/data/terms.json has no terms for ${id}`);
  return terms;
}

function guideFor(id: string): { rate: string; bedrooms: CottageBedroomLabel } {
  const cottage = cottages.find((entry) => entry.id === id);
  if (!cottage) throw new Error(`src/data/site.ts has no cottage ${id}, so its published guide is unknown`);
  return { rate: publishedLuxuryFurnishedRates[cottage.bedrooms], bedrooms: cottage.bedrooms };
}

function display(field: TermField, entry: ValueEntry, today: Date): string {
  if (field === "monthlyRate") return `${dollars(Number(entry.value))}/month`;
  if (field === "deposit") return dollars(Number(entry.value));
  if (field === "availableFrom") return isPastOrToday(String(entry.value), today) ? "Available now" : formatDate(String(entry.value));
  return String(entry.value);
}

/** The six rows of the "Rates & terms" block, in display order. */
export function termRows(id: string, today: Date = new Date()): TermRow[] {
  const terms = termsOf(id);
  return TERM_FIELDS.map((field): TermRow => {
    const entry = terms[field];
    const label = termLabel[field];
    if (entry.status === "guide") {
      const guide = guideFor(id);
      return { field, label, value: `${guide.rate} guide`, status: "listed", note: `The published guide for ${bedroomWords[guide.bedrooms]} homes. Confirm the rate for your dates when you ask.` };
    }
    if (entry.status === "confirm") return { field, label, value: null, status: "confirm", note: entry.note };
    return { field, label, value: display(field, entry, today), status: entry.status };
  });
}

/** The short version for a cottage card: rate, availability and minimum stay. */
export function cardTerms(id: string, today: Date = new Date()): CardTerms {
  const terms = termsOf(id);
  const rate = terms.monthlyRate;
  const available = terms.availableFrom;
  const stay = terms.minimumStay;
  return {
    rate: rate.status === "guide" ? `${guideFor(id).rate} guide` : rate.status === "confirm" ? "Rate on inquiry" : display("monthlyRate", rate, today),
    available: available.status === "confirm" || available.status === "guide"
      ? "Dates on inquiry"
      : isPastOrToday(String(available.value), today) ? "Available now" : `Available ${formatDate(String(available.value))}`,
    minimumStay: stay.status === "confirm" || stay.status === "guide" ? null : `${String(stay.value)} minimum`,
  };
}

/**
 * A schema.org Offer, only when the owner has confirmed this home's monthly
 * rate. A guide or an unconfirmed rate publishes no Offer.
 */
export function offerFor(id: string, homeUrl: string, today: Date = new Date()): Record<string, unknown> | null {
  const terms = termsOf(id);
  const rate = terms.monthlyRate;
  if (rate.status !== "confirmed") return null;
  const price = Number(rate.value);
  const available = terms.availableFrom;
  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    "@id": `${homeUrl}#offer`,
    url: homeUrl,
    itemOffered: { "@id": `${homeUrl}#home` },
    businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
    price,
    priceCurrency: "USD",
    priceSpecification: { "@type": "UnitPriceSpecification", price, priceCurrency: "USD", unitCode: "MON", unitText: "month" },
    ...(available.status === "confirmed" && { availabilityStarts: isPastOrToday(String(available.value), today) ? today.toISOString().slice(0, 10) : String(available.value) }),
  };
}

/**
 * Throws when a home still lists a rate or term in its own facts, so the
 * terms block stays the only source and the two can never disagree.
 */
export function assertTermsOwnedByBlock(home: HomeMicrosite): void {
  const duplicates = home.facts.filter((fact) => termFactLabels.test(fact.label.trim()));
  if (duplicates.length > 0) {
    throw new Error(`${home.id}: "${duplicates.map((fact) => fact.label).join('", "')}" belongs in src/data/terms.json, not in the home's facts`);
  }
}
