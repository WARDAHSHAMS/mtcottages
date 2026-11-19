import { termRows, type TermRow } from "../terms";
import type { FactStatus, GuideSection } from "./types";

/**
 * The resident guide for homes that share the standard Mt Cottages terms
 * (flagship gap C, #89). Frederick keeps its own hand-written guide.
 *
 * Every line traces to one of:
 * - src/data/terms.json (utilities, minimum stay, pets), read here so the
 *   guide can never disagree with the "Rates & terms" block;
 * - the house rules in the ops SOP "Respond to Inquiry", adopted for every
 *   home on #70 (notes/owner-decisions.md, T2): no pets, no smoking, no
 *   overnight guests, quiet hours, designated parking, trash on Sundays;
 * - the #70 ruling that the lease governs cancellation;
 * - the home's own listing (internet, laundry), passed in by the home;
 * - or it is status "confirm" and listed for the owner on #74.
 */

export type GuideLine = { text: string; status: FactStatus };

export type ResidentGuideInput = {
  /** The id in src/data/terms.json. */
  id: string;
  /** The home's internet line, from its listing (or "confirm"). */
  internet: GuideLine;
  /** The home's laundry line, from its photos or listing (or "confirm"). */
  laundry: GuideLine;
};

const row = (rows: TermRow[], field: TermRow["field"]): TermRow => {
  const found = rows.find((entry) => entry.field === field);
  if (!found) throw new Error(`terms.json row ${field} is missing`);
  return found;
};

/** A terms row as a guide line, or a "confirm" line when the value is not settled. */
const termLine = (term: TermRow, known: (value: string) => string, unknown: string): GuideLine =>
  term.value === null ? { text: unknown, status: "confirm" } : { text: known(term.value), status: term.status };

export function residentGuide({ id, internet, laundry }: ResidentGuideInput): GuideSection[] {
  const rows = termRows(id);
  const utilities = termLine(row(rows, "utilities"), (value) => `Utilities: ${value.toLowerCase()} in the monthly rate.`, "Utilities: which ones the monthly rate covers is confirmed on inquiry.");
  const minimum = termLine(row(rows, "minimumStay"), (value) => `Stay length: ${value.toLowerCase()} minimum.`, "Stay length: the minimum is confirmed on inquiry.");
  const pets = termLine(row(rows, "pets"), (value) => `${value}.`, "Pets: confirmed on inquiry.");

  return [
    {
      id: "arrival",
      title: "Arrival",
      intro: "Arrival is arranged for each stay. Share your timing early so we can plan the keys and a walkthrough.",
      items: [
        { text: "Keys or door code: how you get in is set in the pre-arrival message.", status: "confirm" },
        { text: "Arrival time: windows are set per stay. Share your travel timing in your inquiry.", status: "confirm" },
        { text: "Parking: park only in the designated spot for the home.", status: "confirmed" },
        { text: "Which spot is yours, and any street or winter rules, come in the pre-arrival message.", status: "confirm" },
        { text: "Wifi name and password are shared at arrival, never on this site.", status: "confirm" },
      ],
    },
    {
      id: "utilities",
      title: "Utilities",
      intro: "Utilities are part of the monthly rate on every Mt Cottages listing. Provider names and the thermostat are explained for each stay.",
      items: [
        utilities,
        internet,
        { text: "Internet speed: confirm on inquiry if your work depends on it.", status: "confirm" },
        laundry,
        { text: "Heating, cooling and the thermostat: ask how the home is heated and cooled before you arrive.", status: "confirm" },
      ],
    },
    {
      id: "handbook",
      title: "House rules",
      intro: "The same house rules apply in every Mt Cottages home. Treat the house as a home on a residential street.",
      items: [
        pets,
        { text: "No smoking.", status: "confirmed" },
        { text: "No overnight guests.", status: "confirmed" },
        { text: "Quiet hours apply. The exact times are in your agreement.", status: "confirmed" },
        { text: "Trash goes out on Sundays.", status: "confirmed" },
        { text: "Where the trash and recycling carts are kept, and the recycling rules.", status: "confirm" },
      ],
      links: [
        { label: "Privacy", href: "/privacy.html" },
        { label: "Common questions", href: "/faq.html" },
      ],
    },
    {
      id: "policies",
      title: "Stay length and payments",
      intro: "An inquiry is a conversation, not a lease or an approval. Screening, the agreement and payments are separate steps with their own documents.",
      items: [
        minimum,
        { text: "Cancellation and notice follow your lease; this site sets no separate cancellation terms.", status: "confirmed" },
        { text: "Pay only through the instructions tied to your agreement. Never email card or bank details.", status: "confirmed" },
        { text: "Do not send Social Security numbers or sensitive documents through the public form.", status: "confirmed" },
        { text: "Occupants and accessibility needs are agreed in advance.", status: "confirmed" },
      ],
      links: [
        { label: "Resident portal", href: "/resident-portal.html" },
        { label: "Pay rent", href: "/pay-rent.html" },
        { label: "Resident resources", href: "/residents.html" },
      ],
    },
    {
      id: "maintenance",
      title: "Maintenance and emergencies",
      intro: "For anything urgent and dangerous, call 911 first.",
      items: [
        { text: "Non-emergency: send the home, the room, the problem, the timing and a helpful photo through the maintenance path.", status: "confirmed" },
        { text: "Emergency (fire, a gas smell, major flooding or immediate danger): call 911 first, then resident support.", status: "confirmed" },
      ],
      links: [
        { label: "Maintenance request", href: "/maintenance.html" },
        { label: "Emergency guidance", href: "/emergency-maintenance.html" },
      ],
    },
  ];
}
