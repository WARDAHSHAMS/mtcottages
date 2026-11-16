/**
 * Travel-nurse hub (Growth M1, #29): /travel-nurses/ for persona P1 in
 * docs/marketing/brand-and-positioning.md. It replaces the generic
 * /health-professionals.html guide, which is now a noindex redirect to it.
 * Rendered by src/components/TravelNurseHub.astro.
 *
 * Honesty rules, enforced by e2e/tests/travel-nurses.spec.js:
 * - Drive minutes come only from _data/distances.json (measured, dated, sourced),
 *   through distancesFor(); nothing is typed into the copy by hand.
 * - The GSA figures below were read from GSA's own FY2027 files and carry their
 *   fiscal year and source. GSA is a reference for lodging cost, not a promise
 *   of any stipend, and the page says so.
 * - A guide price is labelled "confirm on inquiry" unless the owner confirmed it.
 * - Nothing about minimum stay, pets, utilities, parking, blackout shades or
 *   response time is stated unless a home's own data lists it.
 * - No affiliation with any hospital or health system is claimed.
 */
import { homes } from "./homes";
import { hasStreetAddress } from "./homes/links";
import { distancesFor, formatMeasured } from "./distances";
import { confirmedPriceHomes, type Faq } from "./townLanding";
import type { HomeMicrosite } from "./homes/types";

export const hubPath = "travel-nurses/index.html";
/** The URL every internal link uses: Astro writes the directory form under build.format "preserve". */
export const hubHref = "/travel-nurses/";

export const hub = {
  title: "Travel Nurse Housing in the Mid-Ohio Valley | Mt Cottages",
  description: "Furnished homes near Camden Clark, Marietta Memorial and Jackson General for 13-week and longer stays, with the GSA lodging per diem beside our guide prices.",
  eyebrow: "Travel nurses and medical staff",
  h1: "Travel nurse housing in Parkersburg, WV and Marietta, Ohio",
  lede: "Taking a contract at WVU Medicine Camden Clark in Parkersburg, WV, at Marietta Memorial in Marietta, Ohio, or at Jackson General in Ripley, WV? Mt Cottages offers whole furnished homes instead of a hotel room: your own front door, a full kitchen and fiber-optic internet, a short drive from the hospital.",
  intro: "This page shows the measured drive from each home to each hospital, sets the federal lodging per diem beside our monthly guide prices, and answers what travel nurses ask us most. Anything we have not confirmed says so, and we confirm it in writing before you commit.",
  heroAlt: "Oak Cottage guest bedroom with an upholstered headboard",
  inquiryLabel: "Find a home near your hospital",
} as const;

// ---------------------------------------------------------------------------
// GSA lodging per diem
// ---------------------------------------------------------------------------

/**
 * Read on 15 November 2026 from GSA's published FY2027 files:
 * - FY2027_PerDiemRates_Validated090126.xlsx: "Standard CONUS rate applies to all
 *   counties not specifically listed", lodging 113, M&IE 68; no row for Wood County WV,
 *   Washington County OH or Jackson County WV.
 * - FY2027PerDiemZipCode_Validated090126.xlsx: ZIP 26101, 26104, 26164, 25271 and 45750
 *   are each "Standard Rate", lodging 113.
 * - GSA Per Diem Bulletin FTR 27-01: standard lodging rose from $110 (FY2026) to $113
 *   for travel from 1 October 2026 through 30 September 2027.
 */
export const perDiem = {
  fiscalYear: "FY2027",
  period: "October 1, 2026 to September 30, 2027",
  lodgingPerNight: 113,
  nights: 30,
  prior: { fiscalYear: "FY2026", lodgingPerNight: 110 },
  checked: "November 2026",
  /** Every county the page speaks about falls under the standard CONUS rate. */
  counties: [
    { county: "Wood County, West Virginia", place: "Parkersburg", zips: "ZIP codes 26101 and 26104" },
    { county: "Washington County, Ohio", place: "Marietta, Ohio", zips: "ZIP code 45750" },
    { county: "Jackson County, West Virginia", place: "Ravenswood and Ripley", zips: "ZIP codes 26164 and 25271" },
  ],
  sources: [
    { label: "GSA per diem rates look-up", href: "https://www.gsa.gov/travel/plan-book/per-diem-rates" },
    { label: "GSA Per Diem Bulletin FTR 27-01", href: "https://www.gsa.gov/policy-regulations/regulations/federal-travel-regulation/ftr-and-related-files/gsa-per-diem-bulletin-ftr-2701" },
    { label: "GSA FY2027 per diem rates file", href: "https://www.gsa.gov/system/files/FY2027_PerDiemRates_Validated090126.xlsx" },
  ],
} as const;

export const perDiemMonth = perDiem.lodgingPerNight * perDiem.nights;

export const usd = (amount: number): string => `$${amount.toLocaleString("en-US")}`;

const parseGuide = (priceGuide: string | undefined, id: string): number => {
  const match = priceGuide?.match(/^\$([\d,]+)\/month$/);
  if (!match) throw new Error(`Travel-nurse hub: home "${id}" has no "$N/month" priceGuide to chart`);
  return Number.parseInt(match[1].replace(/,/g, ""), 10);
};

export type ChartRow = {
  id: string;
  label: string;
  detail: string;
  amount: number;
  /** Width of the bar, as a share of the 30-night per diem. */
  share: number;
  status: string;
  /** "$1,495 below" or "$300 above" the 30-night figure; empty for the reference row itself. */
  gap: string;
};

const bedroomWord = (count: number) => `${count} bedroom${count === 1 ? "" : "s"}`;

/** One bar per live home, from its own published guide price, ordered cheapest first. */
export const chartRows: ChartRow[] = homes
  .map((home: HomeMicrosite): ChartRow => {
    const amount = parseGuide(home.priceGuide, home.id);
    const diff = perDiemMonth - amount;
    return {
      id: home.id,
      label: home.name,
      detail: `${bedroomWord(home.bedrooms)}, ${home.town.name}, ${home.town.state}`,
      amount,
      share: Math.min(100, (amount / perDiemMonth) * 100),
      status: confirmedPriceHomes.includes(home.id) ? "Monthly guide" : "Guide price, confirm on inquiry",
      gap: `${usd(Math.abs(diff))} ${diff >= 0 ? "below" : "above"}`,
    };
  })
  .sort((a, b) => a.amount - b.amount || a.label.localeCompare(b.label));

export const chartLabel =
  `Bar chart. The federal lodging per diem for ${perDiem.fiscalYear} is ${usd(perDiem.lodgingPerNight)} a night, which is ${usd(perDiemMonth)} for ${perDiem.nights} nights. ` +
  `Mt Cottages monthly guide prices: ${chartRows.map((row) => `${row.label} ${usd(row.amount)}`).join(", ")}. Every guide price is below the ${perDiem.nights}-night figure. The same numbers are in the table below.`;

// ---------------------------------------------------------------------------
// Hospitals and measured drive times
// ---------------------------------------------------------------------------

export type DriveLine = { homeId: string; homeName: string; minutes: number; miles: number; measured: string; sourceUrl: string };

export type HospitalCard = {
  id: string;
  name: string;
  place: string;
  summary: string;
  /** One group of drive lines per hospital campus named in the card. */
  campuses: { label: string; drives: DriveLine[] }[];
  town: { name: string; href: string };
};

const microsite = (id: string): HomeMicrosite => {
  const home = homes.find((entry) => entry.id === id);
  if (!home) throw new Error(`Travel-nurse hub lists "${id}", which has no live home microsite`);
  return home;
};

/** The measured drive from an approved-address home to a destination in _data/distances.json; throws when it is missing. */
const drive = (homeId: string, destination: string): DriveLine => {
  const home = microsite(homeId);
  if (!hasStreetAddress(home)) throw new Error(`${homeId} has no approved street address, so its hospital drive is not published`);
  const row = distancesFor(home).groups.flatMap((group) => group.rows).find((entry) => entry.destination === destination);
  if (!row) throw new Error(`_data/distances.json has no ${destination} row for ${homeId}`);
  return { homeId, homeName: home.name, minutes: row.minutes, miles: row.miles, measured: row.measured, sourceUrl: row.sourceUrl };
};

export const hospitals: HospitalCard[] = [
  {
    id: "camden-clark",
    name: "WVU Medicine Camden Clark Medical Center",
    place: "Parkersburg, West Virginia",
    summary: "Broad and Oak Cottages sit a few blocks apart on Broad Street, on Parkersburg's east side.",
    campuses: [{ label: "Camden Clark Medical Center", drives: [drive("broad", "camden-clark"), drive("oak", "camden-clark")] }],
    town: { name: "Furnished rentals in Parkersburg, WV", href: "/parkersburg/index.html" },
  },
  {
    id: "memorial-health",
    name: "Memorial Health System, Marietta Memorial Hospital",
    place: "Marietta, Ohio",
    summary: "Frederick Cottage is a three-bedroom house on Marietta's east side. Memorial Health System also runs Selby General Hospital in Marietta, Ohio.",
    campuses: [
      { label: "Marietta Memorial Hospital", drives: [drive("frederick", "marietta-memorial")] },
      { label: "Selby General Hospital", drives: [drive("frederick", "selby-general")] },
    ],
    town: { name: "Furnished rentals in Marietta, Ohio", href: "/marietta/index.html" },
  },
  {
    id: "jackson-general",
    name: "WVU Medicine Jackson General Hospital",
    place: "Ripley, West Virginia",
    summary: "The hospital is in Ripley, not Ravenswood. Henrietta Cottage is in Ravenswood, the nearest of our homes to it.",
    campuses: [{ label: "Jackson General Hospital", drives: [drive("henrietta", "jackson-general")] }],
    town: { name: "Ravenswood, West Virginia", href: "/ravenswood/index.html" },
  },
];

/** The latest measurement date behind the hospital drives, e.g. "15 Nov 2026". */
export const drivesMeasured = formatMeasured(
  hospitals.flatMap((card) => card.campuses.flatMap((campus) => campus.drives.map((line) => line.measured))).sort().at(-1) ?? "",
);

export const driveSource =
  `Routes from OpenStreetMap data (OSRM), measured ${drivesMeasured} from each home's approved street address. Free-flow driving times; allow longer at shift change and in bad weather.`;

// ---------------------------------------------------------------------------
// Terms, homes, FAQ
// ---------------------------------------------------------------------------

/** Only what a home's own listing states; everything else is a question to ask. */
export const terms = {
  stated: [
    "Frederick Cottage lists a 30-day minimum stay. Shorter stays are priced on inquiry.",
  ],
  confirm: [
    "Whether your 13-week start and end dates fit the home you want",
    "Minimum stay for every home other than Frederick",
    "What the monthly price covers, including which utilities",
    "Parking space and street rules",
    "Pet policy",
    "Which bedroom is quietest and what covers its windows",
  ],
};

export const homesNote =
  "Buck and Virginia Cottages have no published street address, so we give their drive to each hospital on inquiry. Guide prices are for planning; we confirm the current price and what it covers before you commit.";

export const faqs: Faq[] = [
  {
    q: "Is my housing stipend the same as the GSA per diem?",
    a: "No. Your agency sets your stipend in your contract, and it can be higher or lower than the federal figure. GSA publishes the lodging per diem for government travelers, and many people use it as a rough yardstick for what lodging costs in an area. Treat it as a reference, not a promise, and ask your recruiter for the exact amount in your contract. This page is not tax advice; a tax professional can explain how a stipend applies to you.",
  },
  {
    q: "Can I stay for a 13-week contract?",
    a: "Ask us, and we will confirm it for the home you want. Frederick Cottage lists a 30-day minimum stay, and thirteen weeks is longer than that; we still confirm your dates before you commit. For the other homes, send your start and end dates and we confirm the minimum stay, the price and what is included in writing.",
  },
  {
    q: "Is the bedroom quiet enough to sleep through the day?",
    a: "We cannot promise a home is silent, and we have not confirmed blackout shades for every home. Each home's page shows its real bedroom photos. Ask us which bedroom is farthest from the street and what covers its windows, and we will answer for the home you are considering before you commit.",
  },
  {
    q: "Are utilities and Wi-Fi included?",
    a: "Fiber-optic internet is listed for Frederick Cottage (1 Gbps wired and wifi), Broad, Oak, Buck and Virginia Cottages, and is to be confirmed for Henrietta Cottage. Which utilities the monthly price covers is not confirmed for every home yet, so we confirm it in writing, home by home, before you commit. Compare the price on this page with that answer, not before it.",
  },
  {
    q: "Where do I park, including when I get home at odd hours?",
    a: "Frederick Cottage lists free parking on the premises and on the street, and its photos show a driveway; we confirm your space and the street rules before you arrive. For the other homes the parking arrangement is to be confirmed, so ask before you commit.",
  },
  {
    q: "Do you allow pets?",
    a: "The pet policy is confirmed home by home. Tell us what you travel with when you inquire and we will say whether a home can work.",
  },
  {
    q: "How do I know Mt Cottages is real and this is not a scam?",
    a: "Check what you can check. Our photos are of the actual homes. Frederick, Broad, Oak and Henrietta Cottages publish their street addresses on their own pages, so you can look them up on a map. An inquiry on this site asks for your dates and contact details only: no payment, no Social Security number and no bank details. Any screening, agreement or payment is a separate, later step with its own documents, and you should never email card numbers or bank credentials to anyone, us included. Our email address is stay@mtcottages.com, so be wary of a lookalike.",
  },
];

export const disclaimer =
  "Mt Cottages is an independent furnished-housing company. It is not affiliated with, endorsed by or sponsored by WVU Medicine, Camden Clark Medical Center, Jackson General Hospital, Memorial Health System, Marietta Memorial Hospital or Selby General Hospital. Hospital names are used only to say where our homes are in relation to them.";
