/**
 * Town landing pages (Growth M1: #24 Parkersburg, #28 Marietta). Each town
 * guide that targets "furnished rentals in <town>" searches is rendered by
 * src/components/TownLanding.astro from one entry here.
 *
 * Honesty rules, enforced by e2e/tests/town-landing.spec.js:
 * - A price is shown only for a home whose rate the owner confirmed
 *   (notes/owner-decisions.md row 1); every other home says "confirm on inquiry".
 * - Drive and walk times are measured routes, with the source and date on the page.
 * - Facts that are not confirmed for every home are listed as "confirm on inquiry".
 * - Homes the CEO parked (Yellow, Walnut) are never listed.
 */
import type { Photo } from "./site";
import type { StayTown } from "./stay-link";
import { homes } from "./homes";
import type { HomeMicrosite } from "./homes/types";
import broadLiving from "../../assets/images/cottages/parkersburg-01/photo-44.avif";

/** Homes whose monthly price guide the owner confirmed. Only these show a price on a town landing page. */
export const confirmedPriceHomes: readonly string[] = ["frederick"];

export type TownLandingHome = {
  id: string;
  /** One honest line on who this home suits best. */
  fit: string;
  /** Short facts for the card, taken from the home's own fact list. */
  facts: string[];
};

export type RouteTime = { minutes: number; miles: number };

export type DistanceRow = {
  homeId: string;
  /** One value per destination column, in order; null when the home has no published address. */
  times: (RouteTime | null)[];
  note?: string;
};

export type Audience = { title: string; body: string; href: string; linkLabel: string };

export type Faq = { q: string; a: string };

export type TownLanding = {
  /** Matches the key in locationData (src/data/site.ts). */
  key: string;
  /** Site path of the page, as in locationData (build.format "preserve"). */
  path: string;
  /** Full town name used in breadcrumbs and copy, e.g. "Parkersburg, West Virginia". */
  town: string;
  /** Short form used in buttons, e.g. "Parkersburg". */
  shortTown: string;
  /** <title>, 60 characters or fewer. */
  title: string;
  /** Meta description, 160 characters or fewer. */
  description: string;
  eyebrow: string;
  h1: string;
  /** First paragraph: carries the town's priority-1 search phrases in plain sentences. */
  lede: string;
  intro: string;
  hero: Photo;
  /** Town the page's "Check dates" links pre-select; the links are built with stayLink (#20). */
  stayTown: StayTown;
  inquiryLabel: string;
  homesHeading: string;
  homesIntro: string;
  homes: TownLandingHome[];
  distance: {
    heading: string;
    intro: string;
    mode: "drive" | "drive-walk";
    destinations: string[];
    rows: DistanceRow[];
    /** Walking times, same shape as rows; only for "drive-walk". */
    walkRows?: DistanceRow[];
    source: string;
  };
  included: string[];
  confirm: string[];
  audiences: Audience[];
  faqs: Faq[];
  /** Other town pages to cross-link. */
  nearbyTowns: { name: string; href: string }[];
};

const homeById = new Map(homes.map((home) => [home.id, home]));

/** The live microsite for a landing-page home; throws at build time if the id is wrong or parked. */
export const landingHome = (id: string): HomeMicrosite => {
  const home = homeById.get(id);
  if (!home) throw new Error(`Town landing lists "${id}", which has no live home microsite`);
  return home;
};

const osrmSource = "Routes from OpenStreetMap data (OSRM), measured 15 November 2026. Free-flow driving times; allow longer at shift change and in bad weather.";

export const townLandings = {
  parkersburg: {
    key: "parkersburg",
    path: "parkersburg/index.html",
    town: "Parkersburg, West Virginia",
    shortTown: "Parkersburg",
    title: "Furnished Rentals in Parkersburg, WV | Mt Cottages",
    description: "Furnished homes for monthly stays in Parkersburg, WV, minutes from Camden Clark, downtown and I-77. Need a shorter stay? Ask about your dates.",
    eyebrow: "Parkersburg, West Virginia",
    h1: "Furnished rentals in Parkersburg, WV",
    lede: "Looking for a furnished apartment, a monthly rental or a short-term rental in Parkersburg, WV? Mt Cottages offers whole furnished homes instead: your own front door, a full kitchen and fiber-optic internet, a few minutes from WVU Medicine Camden Clark, downtown and I-77.",
    intro: "Three homes are live in Parkersburg today, from a one-bedroom for a single assignment to a three-bedroom for a household. Bring a suitcase; the furniture, kitchen and internet are already here. We confirm price, dates and the details below before you commit to anything.",
    hero: { src: broadLiving, alt: "Broad Cottage living room in Parkersburg with wood paneling, a sectional sofa, a coffee table and a wall-mounted TV", focal: "center 45%" },
    stayTown: "parkersburg",
    inquiryLabel: "Check dates in Parkersburg",
    homesHeading: "Three furnished homes in Parkersburg",
    homesIntro: "Each home has its own site with every photo, an illustrative floor plan, amenities and a map. Pick the one that fits your household, then ask about your dates.",
    homes: [
      { id: "broad", fit: "Best for one person or a couple who wants laundry in the home and a desk in the bedroom.", facts: ["1 bedroom, queen bed", "1 bath with tub", "Washer and dryer in the home"] },
      { id: "buck", fit: "Best for one person or a couple who wants a compact, easy home on the north side.", facts: ["1 bedroom", "Full bath with tub and shower", "Covered front porch"] },
      { id: "oak", fit: "Best for a family or a small team who needs three bedrooms and a dining table.", facts: ["3 bedrooms", "Dining room and oak kitchen", "Covered porch"] },
    ],
    distance: {
      heading: "Minutes, not miles",
      intro: "Broad and Oak Cottages sit a few blocks apart on Broad Street, on the city's east side. Here is how long the drive takes to the places most guests ask about.",
      mode: "drive",
      destinations: ["WVU Medicine Camden Clark", "Downtown (Point Park)", "I-77 on-ramp (WV 47)"],
      rows: [
        { homeId: "broad", times: [{ minutes: 7, miles: 2.5 }, { minutes: 7, miles: 2.8 }, { minutes: 10, miles: 4.3 }] },
        { homeId: "oak", times: [{ minutes: 8, miles: 2.7 }, { minutes: 8, miles: 3.0 }, { minutes: 9, miles: 3.7 }] },
        { homeId: "buck", times: [null, null, null], note: "Buck Cottage is on the north side of Parkersburg. We share its street, and exact drive times, when you inquire." },
      ],
      source: osrmSource,
    },
    included: [
      "Furnished throughout: beds, seating, tables and the everyday things a home needs",
      "A full kitchen in every home",
      "Fiber-optic internet",
      "A whole home to yourself, with your own entrance and kitchen",
      "A local team for questions and care during the stay",
    ],
    confirm: [
      "Monthly price and what utilities it covers",
      "Minimum stay and your exact dates",
      "Parking arrangement",
      "Pet policy",
      "How many guests each home sleeps",
    ],
    audiences: [
      { title: "Travel nurses and Camden Clark staff", body: "A quiet place to sleep after a night shift. Broad and Oak Cottages are 7 to 8 minutes from the hospital, with a full kitchen so a thirteen-week contract is not thirteen weeks of takeout.", href: "/health-professionals.html", linkLabel: "Housing for health professionals" },
      { title: "Crews and project teams", body: "Oak Cottage gives a small team three bedrooms under one roof, with I-77 about ten minutes away for sites up and down the valley.", href: "/work-relocation.html", linkLabel: "Work and relocation stays" },
      { title: "Relocating families", body: "Land in a furnished home while you learn the neighborhoods, sort out schools and look for something permanent.", href: "/family-stays.html", linkLabel: "Family stays" },
      { title: "Displaced by a fire or flood", body: "A furnished home near your own while repairs happen. Tell us your timeline and what your insurer needs, and we will check which home fits.", href: "/insurance-housing.html", linkLabel: "Insurance housing" },
    ],
    faqs: [
      { q: "Do you rent by the month in Parkersburg?", a: "Yes. Our Parkersburg homes are set up for monthly stays, from a few months to longer. Tell us your dates and we will confirm the price and what it includes before you decide." },
      { q: "Are these furnished apartments?", a: "They are whole furnished homes rather than apartments. Each has its own entrance, a full kitchen, furnished bedrooms and living space, and fiber-optic internet." },
      { q: "Can I book a short-term rental for a few nights or weeks?", a: "Our homes are set up for longer stays, so the minimum stay is confirmed with you on inquiry. If you need a few weeks, ask anyway: we will tell you straight away whether a home can work." },
      { q: "How close are the homes to WVU Medicine Camden Clark?", a: "Broad Cottage is about 7 minutes (2.5 miles) by car and Oak Cottage about 8 minutes (2.7 miles), on measured routes in normal traffic. We share Buck Cottage's street and drive time when you inquire." },
      { q: "What is included in the price?", a: "Every home is furnished, with a full kitchen and fiber-optic internet. Which utilities are covered, parking and the pet policy differ by home, so we confirm each one in writing before you commit." },
      { q: "Is sending an inquiry a commitment?", a: "No. An inquiry starts a conversation about current options. Any screening, agreement or payment is a separate step that comes later, with its own documents." },
    ],
    nearbyTowns: [
      { name: "Marietta, Ohio", href: "/marietta/index.html" },
      { name: "Ravenswood, West Virginia", href: "/ravenswood/index.html" },
    ],
  },
} satisfies Record<string, TownLanding>;
