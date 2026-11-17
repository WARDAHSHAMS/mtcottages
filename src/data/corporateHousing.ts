/**
 * Corporate and project-crew housing hub (Growth M1, #34): /corporate-housing/ for
 * persona P2 in docs/marketing/brand-and-positioning.md. It replaces the generic
 * /work-relocation.html guide, which is now a noindex redirect to it
 * (src/pages/work-relocation.html.ts). Rendered by src/components/CorporateHousingHub.astro.
 * The stay-form audience slug for this page is "crew" (src/data/stay-link.ts).
 *
 * Honesty rules, enforced by e2e/tests/corporate-housing.spec.js:
 * - Nothing in the capacity table is typed by hand. Bedrooms, sleeps, parking, laundry and
 *   internet are read from each home's own data (src/data/homes/*.ts); a fact that is not
 *   confirmed there shows "Confirm on inquiry". The test compares the table with each home's
 *   own page and with _data/houses.json.
 * - Terms (rate, minimum stay, utilities, pets, deposit) come from src/data/terms.json through
 *   terms.ts, the one source every card and microsite reads.
 * - Drive minutes come only from _data/distances.json through distancesFor(), measured from each
 *   home's approved street address; a home with no approved address is not charted.
 * - Payment follows the existing KeyCheck / Furnished Finder flow decided on #70 (2026-11-16):
 *   month to month or three months paid, and no booking held before payment. No direct company
 *   invoicing, net terms or billing to a company account is offered or implied, because a new
 *   billing path is the CEO's decision (notes/owner-decisions.md).
 * - No employer is named as a client or partner. Plant names only say where a home is in
 *   relation to them, and the page says so.
 */
import { homes } from "./homes";
import { hasStreetAddress, homeHref, statusLabel } from "./homes/links";
import { distancesFor, formatMeasured } from "./distances";
import { type Faq } from "./townLanding";
import { termRows, type TermRow } from "./terms";
import type { HomeFact, HomeMicrosite } from "./homes/types";

/** The URL every internal link uses: Astro writes the directory form under build.format "preserve". */
export const hubHref = "/corporate-housing/";
/** The stay-form audience this hub pre-fills. */
export const hubAudience = "crew" as const;

export const hub = {
  title: "Corporate & Crew Housing, Parkersburg WV | Mt Cottages",
  description: "Furnished homes for work crews in Parkersburg, Ravenswood and Marietta, Ohio: crew capacity, drive times to the plants, and how company-paid stays work.",
  eyebrow: "Corporate and project crews",
  h1: "Corporate and crew housing in Parkersburg, WV, Ravenswood, WV and Marietta, Ohio",
  lede: "Sending a crew to a plant or a project on the Ohio River? Mt Cottages offers whole furnished homes in Parkersburg, WV, Ravenswood, WV and Marietta, Ohio, so a team shares one address, a full kitchen and one local point of contact instead of a row of hotel rooms.",
  intro: "This page lists, home by home, the bedrooms and beds, and the parking, laundry and internet we have confirmed. It shows the measured drive to the plants and the interstate, and how a company-paid stay works. Anything we have not confirmed says so, and we confirm it before you commit.",
  inquiryLabel: "Find a home for your crew",
} as const;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export const CONFIRM_TEXT = "Confirm on inquiry";

/** "Marietta, Ohio" and "Parkersburg, WV": Marietta is always written with its state. */
const townLabel = (home: HomeMicrosite): string =>
  home.town.state === "OH" ? `${home.town.name}, Ohio` : `${home.town.name}, ${home.town.state}`;

const bedroomWord = (count: number): string => `${count} bedroom${count === 1 ? "" : "s"}`;

const joinNames = (names: string[]): string =>
  names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

const sortedHomes: HomeMicrosite[] = [...homes].sort((a, b) => b.bedrooms - a.bedrooms || a.name.localeCompare(b.name));

// ---------------------------------------------------------------------------
// Crew-capacity table
// ---------------------------------------------------------------------------

export type CapacityCell = {
  /** What the table shows. */
  text: string;
  /** The status badge for a fact the home's own data confirms; null when it says "Confirm on inquiry". */
  status: string | null;
  confirmed: boolean;
};

export type CapacityRow = {
  id: string;
  name: string;
  href: string;
  town: string;
  bedrooms: number;
  /** "Sleeps 6", or "Confirm on inquiry". */
  sleeps: CapacityCell;
  /** Bed types from the home's Bedrooms fact, e.g. "King, double, queen"; null when the home lists none. */
  beds: string | null;
  parking: CapacityCell;
  laundry: CapacityCell;
  internet: CapacityCell;
};

const unconfirmed: CapacityCell = { text: CONFIRM_TEXT, status: null, confirmed: false };

/**
 * One fact as the table shows it. A fact the home confirms, lists or photographs prints its value
 * with its status; a fact still marked "confirm" (or missing) prints only "Confirm on inquiry",
 * because a placeholder such as "Parking arrangement" is not a statement about the home.
 */
const factCell = (home: HomeMicrosite, label: string): CapacityCell => {
  const fact: HomeFact | undefined = home.facts.find((entry) => entry.label === label);
  if (!fact || fact.status === "confirm") return unconfirmed;
  return { text: fact.value, status: statusLabel[fact.status], confirmed: true };
};

const sleepsCell = (home: HomeMicrosite): CapacityCell => {
  const cell = factCell(home, "Sleeps");
  return cell.confirmed && /^\d+$/.test(cell.text) ? { ...cell, text: `Sleeps ${cell.text}` } : cell;
};

/**
 * The bed types after the count in a listed Bedrooms fact: "3 (king, double, queen)" gives
 * "King, double, queen" and "1, with a queen bed" gives "A queen bed". Null when the fact is a bare number.
 * Throws when the fact's count disagrees with `bedrooms`, so the two can never drift apart.
 */
const bedDetail = (home: HomeMicrosite): string | null => {
  const fact = home.facts.find((entry) => entry.label === "Bedrooms");
  if (!fact || fact.status === "confirm") return null;
  const match = fact.value.match(/^(\d+)\s*(?:\((.+)\)|,\s*(?:with\s+)?(.+))?$/);
  if (!match) return null;
  if (Number.parseInt(match[1], 10) !== home.bedrooms) {
    throw new Error(`${home.id}: the Bedrooms fact says "${fact.value}" but bedrooms is ${home.bedrooms}`);
  }
  const detail = match[2] ?? match[3];
  return detail ? `${detail.charAt(0).toUpperCase()}${detail.slice(1)}` : null;
};

/** One row per live home, most bedrooms first. */
export const capacityRows: CapacityRow[] = sortedHomes.map((home): CapacityRow => ({
  id: home.id,
  name: home.name,
  href: homeHref(home),
  town: townLabel(home),
  bedrooms: home.bedrooms,
  sleeps: sleepsCell(home),
  beds: bedDetail(home),
  parking: factCell(home, "Parking"),
  laundry: factCell(home, "Laundry"),
  internet: factCell(home, "Internet"),
}));

const mostBedrooms = Math.max(...capacityRows.map((row) => row.bedrooms));
const largest = capacityRows.filter((row) => row.bedrooms === mostBedrooms);

export const capacityNote =
  `${joinNames(largest.map((row) => row.name))} ${largest.length === 1 ? "has" : "have"} the most bedrooms: ${bedroomWord(mostBedrooms)}${largest.length === 1 ? "" : " each"}. ` +
  "Bedroom counts and bed types are the homes' own listings; every other cell shows a detail only when the home's page confirms, lists or photographs it, and says Confirm on inquiry otherwise.";

export const capacityCaption =
  "Crew capacity for each home: bedrooms, beds and how many it sleeps, parking, laundry and internet, with how well each detail is confirmed";

// ---------------------------------------------------------------------------
// Drive minutes to the plants and the interstate
// ---------------------------------------------------------------------------

/** The destinations in _data/distances.json that matter to a crew: two plants and the I-77 access points. */
const crewDestinations = [
  { id: "chemours-washington-works", area: "Plant in Washington, WV" },
  { id: "constellium-ravenswood", area: "Plant in Ravenswood, WV" },
  { id: "i77-parkersburg", area: "I-77 corridor" },
  { id: "i77-ravenswood", area: "I-77 corridor" },
  { id: "i77-marietta", area: "I-77 corridor" },
] as const;

export type DriveLine = { homeId: string; homeName: string; minutes: number; miles: number; measured: string; share: number };
export type DriveGroup = {
  id: string;
  label: string;
  area: string;
  /** What the measurement is to, from _data/distances.json (e.g. "gate times vary by shift entrance"). */
  note: string;
  drives: DriveLine[];
};

const addressedHomes = sortedHomes.filter(hasStreetAddress);

const rawGroups = crewDestinations.map(({ id, area }) => {
  const lines = addressedHomes.flatMap((home) => {
    const row = distancesFor(home).groups.flatMap((group) => group.rows).find((entry) => entry.destination === id);
    return row ? [{ home, row }] : [];
  });
  if (lines.length === 0) throw new Error(`_data/distances.json has no ${id} row for any home with an approved street address`);
  return { id, area, label: lines[0].row.label, note: lines[0].row.note ?? "", lines };
});

const maxMinutes = Math.max(...rawGroups.flatMap((group) => group.lines.map(({ row }) => row.minutes)));

/** One group per destination; the nearest home first. Bars share one scale, set by the longest drive. */
export const driveGroups: DriveGroup[] = rawGroups.map((group): DriveGroup => ({
  id: group.id,
  label: group.label,
  area: group.area,
  note: group.note,
  drives: group.lines
    .map(({ home, row }): DriveLine => ({
      homeId: home.id,
      homeName: home.name,
      minutes: row.minutes,
      miles: row.miles,
      measured: row.measured,
      share: Math.max(4, (row.minutes / maxMinutes) * 100),
    }))
    .sort((a, b) => a.minutes - b.minutes || a.miles - b.miles || a.homeName.localeCompare(b.homeName)),
}));

export const driveChartLabel =
  "Bar chart of drive minutes from each home to the plants and the interstate. " +
  driveGroups.map((group) => `${group.label}: ${group.drives.map((line) => `${line.homeName} ${line.minutes} minutes`).join(", ")}`).join(". ") +
  ". The same numbers are in the table below.";

const drivesMeasured = formatMeasured(driveGroups.flatMap((group) => group.drives.map((line) => line.measured)).sort().at(-1) ?? "");

export const driveSource =
  `Routes from OpenStreetMap data (OSRM), measured ${drivesMeasured} from each home's approved street address. Free-flow driving times with no traffic, so allow longer at shift change and in bad weather.`;

const unmeasuredHomes = sortedHomes.filter((home) => !hasStreetAddress(home));
export const driveGap = unmeasuredHomes.length === 0
  ? ""
  : `${joinNames(unmeasuredHomes.map((home) => home.name))} ${unmeasuredHomes.length === 1 ? "has" : "have"} no published street address, so ${unmeasuredHomes.length === 1 ? "its drive is" : "their drives are"} given on inquiry.`;

// ---------------------------------------------------------------------------
// Rates and terms, from src/data/terms.json
// ---------------------------------------------------------------------------

export type TermsCell = { text: string; note?: string; confirmed: boolean };
export type TermsRow = { id: string; name: string; rate: TermsCell; minimumStay: TermsCell; utilities: TermsCell; pets: TermsCell; deposit: TermsCell };

const termOf = (rows: TermRow[], field: TermRow["field"]): TermRow => {
  const row = rows.find((entry) => entry.field === field);
  if (!row) throw new Error(`src/data/terms.ts returned no ${field} row`);
  return row;
};

const termsCell = (row: TermRow, whenUnconfirmed: string): TermsCell =>
  row.value === null
    ? { text: whenUnconfirmed, confirmed: false }
    : { text: row.value, confirmed: row.status === "confirmed" || row.status === "listed" };

/** The deposit is set at booking (decided on #70); until the owner confirms an amount for a home, the table says only that. */
const DEPOSIT_UNCONFIRMED = "Set at booking";

export const termsRows: TermsRow[] = sortedHomes.map((home): TermsRow => {
  const rows = termRows(home.id);
  const rate = termOf(rows, "monthlyRate");
  const isGuide = rate.value !== null && / guide$/.test(rate.value);
  return {
    id: home.id,
    name: home.name,
    rate: { ...termsCell(rate, CONFIRM_TEXT), ...(isGuide ? { note: "Guide price, confirm on inquiry" } : {}), confirmed: rate.status === "confirmed" },
    minimumStay: termsCell(termOf(rows, "minimumStay"), CONFIRM_TEXT),
    utilities: termsCell(termOf(rows, "utilities"), CONFIRM_TEXT),
    pets: termsCell(termOf(rows, "pets"), CONFIRM_TEXT),
    deposit: termsCell(termOf(rows, "deposit"), DEPOSIT_UNCONFIRMED),
  };
});

type TermsField = "minimumStay" | "utilities" | "pets";

/** The single value every home shares for a field, or null when a home differs or is unconfirmed. */
const uniform = (field: TermsField): string | null => {
  const cells = termsRows.map((row) => row[field]);
  if (cells.some((cell) => !cell.confirmed)) return null;
  const values = new Set(cells.map((cell) => cell.text.trim().toLowerCase()));
  return values.size === 1 ? cells[0].text : null;
};

const minimumStay = uniform("minimumStay");
// "30 days" and "One month" are the same minimum written two ways in terms.json.
const oneMonthEverywhere = termsRows.every((row) => row.minimumStay.confirmed && /^(30 days|one month)$/i.test(row.minimumStay.text.trim()));
const utilities = uniform("utilities");
const pets = uniform("pets");
const everyDepositUnconfirmed = termsRows.every((row) => !row.deposit.confirmed);

/** What the terms block states for every home, one line each; a field that differs sends the reader to the table. */
export const statedTerms: string[] = [
  oneMonthEverywhere
    ? "Every home has a one-month minimum stay (30 days)."
    : minimumStay
      ? `Minimum stay at every home: ${minimumStay}.`
      : "The minimum stay differs by home; see the table.",
  utilities && /^included$/i.test(utilities)
    ? "Utilities are included in the monthly price at every home."
    : utilities
      ? `Utilities at every home: ${utilities}.`
      : "Utilities differ by home; see the table.",
  pets && /^no pets$/i.test(pets)
    ? "No pets, at any home."
    : pets
      ? `Pets at every home: ${pets}.`
      : "The pet rule differs by home; see the table.",
  everyDepositUnconfirmed
    ? "The security deposit is set at booking. We give you the amount for your home on inquiry."
    : "The security deposit is set at booking; the table shows each amount we have confirmed.",
];

/** Questions a crew coordinator needs answered before they commit, not yet confirmed for every home. */
export const confirmTerms: string[] = [
  "Parking for each vehicle, and whether work trucks or trailers fit",
  "Which bedroom has which bed, and how many people each home sleeps, wherever the table says Confirm on inquiry",
  "Your start and end dates, and when the home you want is free",
  "The security deposit amount",
  "How an early or late arrival works around a shift or a long drive",
  "What happens if the job ends early or slips: the lease sets cancellation, and we share it before you commit",
];

// ---------------------------------------------------------------------------
// How company-paid stays work (decided on #70, 2026-11-16)
// ---------------------------------------------------------------------------

export const process = {
  eyebrow: "Company-paid stays",
  heading: "How company-paid stays work",
  intro: "A company-paid stay follows the same four steps as every Mt Cottages stay, so a coordinator can set it up in one conversation.",
  steps: [
    {
      title: "Send an inquiry",
      body: "Use the stay form. Tell us the site or plant, your dates, how many people are coming and any home you have in mind. The form never asks for payment, a Social Security number or bank details, and an inquiry is a conversation, not a lease.",
    },
    {
      title: "We match a home",
      body: "We reply with the homes that fit your dates and headcount, and confirm the details this page marks Confirm on inquiry, such as parking and the deposit, before you commit.",
    },
    {
      title: "Payment, through the existing flow",
      body: "Payment goes through the same flow every Mt Cottages stay uses, which runs through Furnished Finder and KeyCheck: month to month, or with three months paid. If your company is paying, say so on your inquiry; the company can pay through that same flow. We hold no booking before payment.",
    },
    {
      title: "Move in",
      body: "Once payment is in, the home is held for your agreed dates, and one local team answers questions during the stay.",
    },
  ],
  limits: "If your accounts team needs paperwork, a purchase order or a different payment arrangement, say so on your inquiry. We tell you plainly what the payment flow can provide before you commit.",
} as const;

// ---------------------------------------------------------------------------
// Relocating new hires: the old /work-relocation.html page served them too
// ---------------------------------------------------------------------------

export const relocation = {
  eyebrow: "New hires",
  heading: "Relocating for a new job?",
  body: "A new hire moving to the valley can use the same homes while looking for a place of their own. The terms above apply, so the stay starts at one month and you can pay month to month. Tell us your start date and who is moving with you, and we say which home fits.",
  linkLabel: "Moving with a family? See family stays",
  linkHref: "/family-stays.html",
} as const;

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

const chemours = driveGroups.find((group) => group.id === "chemours-washington-works");
const constellium = driveGroups.find((group) => group.id === "constellium-ravenswood");
if (!chemours || !constellium) throw new Error("The corporate-housing hub needs the Chemours Washington Works and Constellium Ravenswood drive groups");

const drivePhrase = (line: DriveLine): string => `${line.homeName} about ${line.minutes} minutes (${line.miles.toFixed(1)} miles)`;

const sleepsListed = capacityRows.filter((row) => row.sleeps.confirmed);
const parkingListed = capacityRows.filter((row) => row.parking.confirmed);
const internetListed = capacityRows.filter((row) => row.internet.confirmed).map((row) => row.name);
const internetOpen = capacityRows.filter((row) => !row.internet.confirmed).map((row) => row.name);

export const faqs: Faq[] = [
  {
    q: "How many people can each home sleep?",
    a: `${sleepsListed.length > 0 ? `${joinNames(sleepsListed.map((row) => `${row.name} lists that it sleeps ${row.sleeps.text.replace(/^Sleeps /, "")}`))}. For every other home the number of guests` : "The number of guests each home sleeps"} is not confirmed, so the table says Confirm on inquiry. ` +
      `The bedrooms are ${joinNames(capacityRows.map((row) => `${row.name} ${row.bedrooms}`))}. Tell us your headcount and we confirm in writing which home fits.`,
  },
  {
    q: "Where do work trucks and trailers park?",
    a: `${parkingListed.length === 0 ? "Parking is not yet confirmed at any home, so the table says Confirm on inquiry for each one." : `${joinNames(parkingListed.map((row) => `${row.name}: ${row.parking.text}`))}. Every other home says Confirm on inquiry.`} ` +
      "Tell us how many vehicles are coming, and whether any are work trucks or trailers, and we answer for the home you are considering before you commit.",
  },
  {
    q: "Can my company pay for the stay?",
    a: "Yes. A company can pay through the same flow every guest uses, which runs through Furnished Finder and KeyCheck, either month to month or with three months paid. We hold no booking before payment. Say on your inquiry that a company is paying.",
  },
  {
    q: "Can you invoice my company directly?",
    a: "Payment runs through the flow above, and we do not offer net payment terms. If your accounts team needs an invoice, a purchase order or other paperwork, say so on your inquiry and we tell you plainly what we can provide before you commit.",
  },
  {
    q: "How far are the homes from the plants?",
    a: `To the Chemours Washington Works site, ${joinNames(chemours.drives.map(drivePhrase))}. ` +
      `To Constellium Ravenswood, ${joinNames(constellium.drives.map(drivePhrase))}. ` +
      "These are measured routes in free-flow driving, from each home's street address to the plant site as mapped, so allow longer at shift change and in bad weather; gate times vary by shift entrance.",
  },
  {
    q: "Can a crew stay for less than a month?",
    a: oneMonthEverywhere
      ? "No. Every home has a one-month minimum stay (30 days), and we do not offer shorter stays. Send your dates and we confirm that the home you want is free for them."
      : "Each home sets its own minimum stay; the table lists them. Send your dates and we confirm that the home you want is free for them.",
  },
  {
    q: "Are utilities and Wi-Fi included?",
    a: `${utilities && /^included$/i.test(utilities) ? "Utilities are included in the monthly price at every home. " : "Utilities differ by home; the table lists them. "}` +
      `Internet is listed for ${joinNames(internetListed)}${internetOpen.length > 0 ? `, and is to be confirmed for ${joinNames(internetOpen)}` : ""}. We confirm the details in writing before you commit.`,
  },
  {
    q: "Do you allow pets?",
    a: pets && /^no pets$/i.test(pets) ? "No. Our house rules allow no pets at any home." : "The pet rule differs by home; the table lists it.",
  },
  {
    q: "Is Mt Cottages connected to any of the plants?",
    a: "No. Mt Cottages is an independent furnished-housing company. It is not affiliated with, endorsed by or sponsored by Chemours, Constellium or any other employer. Plant names are used only to say where our homes are in relation to them.",
  },
];

export const disclaimer =
  "Mt Cottages is an independent furnished-housing company. It is not affiliated with, endorsed by or sponsored by Chemours, Constellium or any other employer named on this page, and no employer is a client or partner of ours. Plant names are used only to say where our homes are in relation to them.";

export const homesNote =
  `All ${homes.length} homes are whole furnished houses. Each home's own site has its photos, layout and nearby places; prices are the monthly rate or guide price in the terms table above, and we confirm the current price for your dates.`;
