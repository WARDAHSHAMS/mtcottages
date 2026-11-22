/**
 * Stay policies and FAQ (#36), for /policies/. Nothing here is typed twice:
 * the per-home terms come from src/data/terms.json through termRows(), and
 * the house rules are the ones recorded in notes/owner-decisions.md (decided
 * on #70, 2026-11-16, from the ops SOP "Respond to Inquiry"). A policy the page
 * states for every home is checked against every home at build time, so a
 * home whose terms change cannot leave the page saying something untrue.
 * Anything not confirmed (the security deposit, availability for most homes)
 * says "confirm on inquiry", never a number.
 */
import { homes } from "./homes";
import { homeBase } from "./homes/links";
import { termRows, type TermRow } from "./terms";

export const policiesHref = "/policies/";

/** House rules recorded on #70 (notes/owner-decisions.md, "No pets, every home"). */
export const houseRules = [
  "No pets.",
  "No smoking, inside or outside the home.",
  "No overnight guests beyond the people named for the stay.",
  "Quiet hours are kept, out of respect for the neighbours.",
  "Park only in the home's designated parking.",
] as const;

type Field = TermRow["field"];

const rowsByHome = homes.map((home) => ({ home, rows: termRows(home.id) }));
const term = (rows: TermRow[], field: Field): TermRow => {
  const row = rows.find((candidate) => candidate.field === field);
  if (!row) throw new Error(`policies: termRows has no ${field}`);
  return row;
};

/** The single value every home shares for a field, or a build error naming the home that differs. */
function shared(field: Field, accepted: readonly string[]): string {
  for (const { home, rows } of rowsByHome) {
    const { value } = term(rows, field);
    if (value === null || !accepted.includes(value)) {
      throw new Error(`policies: /policies/ states one ${field} for every home, but ${home.name} has "${value ?? "confirm on inquiry"}"; update src/data/policies.ts`);
    }
  }
  return accepted[0];
}

shared("minimumStay", ["30 days", "One month"]);
shared("utilities", ["Included"]);
shared("pets", ["No pets"]);
const depositOpen = rowsByHome.every(({ rows }) => term(rows, "deposit").value === null);

/** One row per home for the table: rate, availability and deposit as the home's own page shows them. */
export const homeTerms = rowsByHome.map(({ home, rows }) => {
  const cell = (field: Field) => term(rows, field).value ?? "Confirm on inquiry";
  return { id: home.id, name: home.name, town: `${home.town.name}, ${home.town.state}`, href: homeBase(home), rate: cell("monthlyRate"), available: cell("availableFrom"), deposit: cell("deposit") };
});

const depositAnswer = depositOpen
  ? "The security deposit is set when you book, and we confirm the amount for your home before you sign anything. We do not publish a figure until the owner confirms it."
  : "Each home's deposit is in the table on this page and on the home's own page; where it says confirm on inquiry, we tell you the amount before you sign.";

/** Questions shown word for word on /policies/ and published as its FAQPage. */
export const policyFaqs: { q: string; a: string }[] = [
  { q: "What is the minimum stay?", a: "One month (30 nights) at every home. We do not offer nightly or weekend stays. Longer stays are welcome; tell us your dates and we confirm the term with you." },
  { q: "Are utilities included in the monthly rate?", a: "Yes. Utilities are included at every Mt Cottages home. Each home's page lists its furnishings and what is in the kitchen, and anything we have not confirmed is marked confirm on inquiry." },
  { q: "Can I bring a pet?", a: "No. Pets are not allowed at any Mt Cottages home." },
  { q: "Is smoking allowed?", a: "No. Smoking is not allowed at any Mt Cottages home, inside or outside." },
  { q: "Is there a security deposit?", a: depositAnswer },
  { q: "What is the cancellation policy?", a: "Cancellation and refunds follow the lease you sign for your stay; we do not publish a separate cancellation policy. Ask us for the lease terms before you commit, and we will walk you through them." },
  { q: "Is sending an inquiry a booking or an approval?", a: "No. An inquiry starts a conversation about your dates and the homes that fit. Screening, the lease and the deposit are separate steps that come after, and nothing is charged when you send an inquiry." },
  { q: "How do I know a home is available for my dates?", a: "Each home's page shows its available-from date when it is confirmed. Otherwise it says confirm on inquiry: send your dates and we reply with what is free." },
];
