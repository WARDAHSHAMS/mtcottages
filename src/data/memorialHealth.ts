/**
 * Memorial Health System landing (Growth M1, #33):
 * /travel-nurses/memorial-health-marietta/, for travel staff at Marietta Memorial
 * and Selby General, with a #residents section for Memorial's two residencies.
 * It targets the Memorial and residency rows of docs/marketing/keyword-universe.csv
 * (on main). Rendered by src/components/MemorialHealthPage.astro.
 *
 * Honesty rules, enforced by e2e/tests/memorial-health.spec.js:
 * - Drive minutes come only from _data/distances.json, through drive(); nothing
 *   is typed into the copy. There is no measured Belpre row, so no Belpre time.
 * - Residency facts are quoted from Memorial Health System's own pages, read on
 *   16 November 2026, and each programme links its source.
 * - Long-stay terms are only those a home's own data states; year-long stays,
 *   shared stays and everything else are confirmed on inquiry.
 * - No affiliation with Memorial Health System is claimed.
 */
import { homes } from "./homes";
import { drive, driveSource, faqs as hubFaqs, hubHref, type DriveLine } from "./travelNurses";
import { monthlyRateText, termRows } from "./terms";
import type { Faq } from "./townLanding";
import type { HomeMicrosite } from "./homes/types";

export const memorialHref = "/travel-nurses/memorial-health-marietta/";

const home = (id: string): HomeMicrosite => {
  const found = homes.find((entry) => entry.id === id);
  if (!found) throw new Error(`The Memorial page lists "${id}", which has no live home microsite`);
  return found;
};

export const frederick = home("frederick");

/**
 * Frederick's monthly price from src/data/terms.json (#72), the one source every
 * card, microsite and Offer reads. The copy says "confirmed by the owner" only
 * while terms.json marks the rate confirmed; a guide price is called a guide.
 */
const frederickRateText = monthlyRateText("frederick");
if (frederickRateText === null) throw new Error("The Memorial page quotes Frederick Cottage's monthly price, but src/data/terms.json has it as still to confirm");
export const frederickRate = {
  text: frederickRateText,
  confirmed: termRows("frederick").find((row) => row.field === "monthlyRate")?.status === "confirmed",
};
const frederickRatePhrase = frederickRate.confirmed
  ? `a monthly rate of ${frederickRate.text}, confirmed by the owner`
  : `a monthly guide price of ${frederickRate.text}`;
/** The pricing footnote under the drive table. */
export const rateNote = frederickRate.confirmed
  ? "Guide prices are for planning; we confirm the current price and what it covers before you commit. Frederick Cottage's rate is owner-confirmed."
  : "Guide prices are for planning; we confirm the current price and what it covers before you commit.";

// ---------------------------------------------------------------------------
// Measured drives to both Memorial Health System hospitals in Marietta, Ohio
// ---------------------------------------------------------------------------

export const campuses = [
  { id: "marietta-memorial", name: "Marietta Memorial Hospital" },
  { id: "selby-general", name: "Selby General Hospital" },
] as const;

export type DriveRow = { home: HomeMicrosite; place: string; drives: DriveLine[] };

/** One row per home with an approved address, nearest to Marietta Memorial first. */
export const driveRows: DriveRow[] = ["frederick", "broad", "oak"]
  .map((id) => {
    const entry = home(id);
    return {
      home: entry,
      place: `${entry.town.name}, ${entry.town.state === "OH" ? "Ohio" : "WV"}`,
      drives: campuses.map((campus) => drive(id, campus.id)),
    };
  })
  .sort((a, b) => a.drives[0].minutes - b.drives[0].minutes || a.home.name.localeCompare(b.home.name));

const frederickRow = driveRows.find((row) => row.home.id === "frederick");
if (!frederickRow) throw new Error("The Memorial page has no measured Frederick Cottage drives");
const [toMemorial, toSelby] = frederickRow.drives;
const parkersburgRows = driveRows.filter((row) => row.home.id !== "frederick");

export { driveSource };

// ---------------------------------------------------------------------------
// Page copy
// ---------------------------------------------------------------------------

export const page = {
  title: "Housing Near Marietta Memorial Hospital | Mt Cottages",
  description: `Travel nurse and resident housing in Marietta, Ohio: a furnished three-bedroom house ${toMemorial.minutes} minutes from Marietta Memorial Hospital, by measured drive.`,
  eyebrow: "Memorial Health System, Marietta, Ohio",
  h1: "Housing near Marietta Memorial Hospital in Marietta, Ohio",
  lede: `On a travel contract at Marietta Memorial Hospital, or matched to a Memorial Health System residency? Frederick Cottage is a furnished three-bedroom house in Marietta, Ohio, a ${toMemorial.minutes}-minute drive from Marietta Memorial Hospital and ${toSelby.minutes} minutes from Selby General Hospital.`,
  intro: "Travel nurse housing in Marietta, Ohio, should mean a real home, not a hotel room: your own front door, a full kitchen and fiber-optic internet. This page gives the measured drive from each of our nearby homes to both Memorial hospitals, what we know about Memorial's residency programmes, and what we confirm before you commit.",
  inquiryLabel: "Check dates for Frederick Cottage",
} as const;

export const frederickFacts = [
  `${toMemorial.minutes} minutes by car to Marietta Memorial Hospital (${toMemorial.miles.toFixed(1)} mi) and ${toSelby.minutes} minutes to Selby General Hospital (${toSelby.miles.toFixed(1)} mi)`,
  `${frederick.bedrooms} bedrooms, a full kitchen and fiber-optic internet (1 Gbps, wired and wifi)`,
  "A driveway and free parking on the premises and on the street, as the listing states",
  `A 30-day minimum stay, with ${frederickRatePhrase}`,
];

// ---------------------------------------------------------------------------
// Residents (#residents): Memorial Health System's own pages, read 16 Nov 2026
// ---------------------------------------------------------------------------

export type Programme = { id: string; name: string; facts: string[]; sources: { label: string; href: string }[] };

export const residency = {
  checked: "November 2026",
  overview: {
    label: "Memorial Health System, Graduate Medical Education",
    href: "https://www.mhsystem.org/careers/residents/graduate-medical-education/",
  },
  programmes: [
    {
      id: "emergency-medicine",
      name: "Emergency Medicine Residency",
      facts: [
        "A three-year programme (PGY-1 to PGY-3), accredited by the ACGME.",
        "Based at Marietta Memorial Hospital. The programme says residents train across three sites and provide their own transportation to them.",
        `Frederick Cottage is ${toMemorial.minutes} minutes from Marietta Memorial by car.`,
      ],
      sources: [{ label: "Emergency Medicine Residency", href: "https://www.mhsystem.org/emr/" }],
    },
    {
      id: "family-medicine",
      name: "Family Medicine Residency",
      facts: [
        "A three-year, clinic-first programme.",
        "The Family Medicine Resident Clinic is on Memorial's Belpre Medical Campus in Belpre, Ohio, across the Ohio River from Parkersburg.",
        "We have not measured the drive to Belpre yet, so we give it on inquiry for the home you are considering.",
      ],
      sources: [
        { label: "Family Medicine Residency", href: "https://www.mhsystem.org/fmr/" },
        { label: "Family Medicine Resident Clinic", href: "https://www.mhsystem.org/services/primary-care/family-medicine-resident-clinic/" },
      ],
    },
  ] satisfies Programme[],
  housing: [
    "Both programme pages list housing for required out rotations as a benefit and say nothing more about housing, so ask your coordinator what applies to you.",
    "We have not set terms for stays of a year or longer. Send your dates and we confirm the price, the lease length and what is included, in writing, before you commit.",
    `Planning to share with another resident? Say so when you inquire. Frederick Cottage has ${frederick.bedrooms} bedrooms, and we confirm what a shared stay would look like before anyone commits.`,
  ],
};

// ---------------------------------------------------------------------------
// Terms and questions
// ---------------------------------------------------------------------------

export const terms = {
  stated: [
    "Frederick Cottage lists a 30-day minimum stay. Shorter stays are priced on inquiry.",
    `Frederick Cottage has ${frederickRatePhrase}. We confirm the current price before you commit.`,
    "Utilities are included in the monthly price. No pets.",
  ],
  confirm: [
    "Whether your 13-week contract dates fit",
    "Terms for a residency year or longer",
    "The security deposit, set when you book",
    "Parking space and street rules at the Parkersburg homes",
    "Which bedroom is quietest and what covers its windows",
  ],
};

const scam = hubFaqs.find((faq) => /scam/i.test(faq.q));
if (!scam) throw new Error("The travel-nurse hub no longer has its scam question for the Memorial page to reuse");

export const faqs: Faq[] = [
  {
    q: "How far is Frederick Cottage from Marietta Memorial Hospital?",
    a: `${toMemorial.minutes} minutes by car (${toMemorial.miles.toFixed(1)} miles), measured from the cottage's street address on OpenStreetMap routes. Selby General Hospital, also part of Memorial Health System, is ${toSelby.minutes} minutes (${toSelby.miles.toFixed(1)} miles). These are free-flow times; allow longer at shift change and in bad weather.`,
  },
  {
    q: "Can I stay for a 13-week contract?",
    a: "Thirteen weeks is longer than Frederick Cottage's 30-day minimum stay. Send your start and end dates and we confirm, in writing, whether they fit before you commit.",
  },
  {
    q: "Do you rent for a whole residency year?",
    a: "Ask us with your dates. We have not published terms for stays of a year or longer, so we confirm the price, the lease length and what is included in writing before you commit.",
  },
  {
    q: "What if Frederick Cottage is taken for my dates?",
    a: `Broad and Oak Cottages in North Parkersburg, WV, are ${parkersburgRows.map((row) => `${row.drives[0].minutes}`).join(" and ")} minutes from Marietta Memorial Hospital by car. Tell us your dates and we say which homes fit.`,
  },
  {
    q: "Is Mt Cottages part of Memorial Health System?",
    a: "No. Mt Cottages is an independent furnished-housing company. It is not affiliated with, endorsed by or sponsored by Memorial Health System. We name the hospitals only to say where our homes are in relation to them.",
  },
  scam,
];

export const disclaimer =
  "Mt Cottages is an independent furnished-housing company. It is not affiliated with, endorsed by or sponsored by Memorial Health System, Marietta Memorial Hospital, Selby General Hospital or their residency programmes. Hospital and programme names are used only to say where our homes are in relation to them, and programme facts are quoted from Memorial Health System's public pages.";

export { hubHref };
