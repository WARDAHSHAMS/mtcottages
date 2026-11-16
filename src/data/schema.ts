/**
 * Site-wide structured data (#22). One LodgingBusiness with a stable @id that
 * every page publishes the same way, the towns it serves, and breadcrumb
 * helpers. Home microsites add their Accommodation in src/data/homes/schema.ts.
 *
 * Every builder returns a schema-dts type (Google's typed schema.org
 * vocabulary), so `npm run check` fails on an unknown type, an unknown
 * property, or a value of the wrong type. That is the vocabulary gate: it runs
 * offline in every pipeline, with no third-party validator in the path.
 *
 * Honesty rules: no street address for the business (it has no public office),
 * no rating or review markup until real reviews exist, and no price or offer
 * until prices are owner-confirmed. e2e/tests/schema.spec.js enforces these on
 * the built pages.
 */
import type { BreadcrumbListLeaf, CityLeaf, FAQPageLeaf, JsonLdObject, ListItemLeaf, LodgingBusinessLeaf, QuestionLeaf, WithContext } from "schema-dts";
import { homes } from "./homes";
import { homeBase } from "./homes/links";

/** Any JSON-LD node a page may publish (a layout's `schema` prop). */
export type SchemaNode = JsonLdObject;

export const origin = "https://mtcottages.com";
export const businessId = `${origin}/#business`;

const stateName = { OH: "Ohio", WV: "West Virginia" } as const;
type StateCode = keyof typeof stateName;

/** A town as a schema.org City inside its State, e.g. "Marietta, Ohio". */
export const cityPlace = (town: string, state: StateCode): CityLeaf => ({
  "@type": "City",
  name: `${town}, ${stateName[state]}`,
  containedInPlace: { "@type": "State", name: stateName[state], containedInPlace: { "@type": "Country", name: "US" } },
});

/** Towns with a live home. Racine and Grantsville are planning guides only, so they are not claimed here. */
const servedTowns: { town: string; state: StateCode }[] = [
  { town: "Marietta", state: "OH" },
  { town: "Parkersburg", state: "WV" },
  { town: "Ravenswood", state: "WV" },
];

/** The id a home microsite's Accommodation node carries (see homes/schema.ts). */
export const homeNodeId = (base: string) => `${new URL(base, origin).toString()}#home`;

export const businessSchema = (image: string): WithContext<LodgingBusinessLeaf> => ({
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  "@id": businessId,
  name: "Mt Cottages",
  description: "Furnished whole homes for monthly and longer stays in Marietta, Ohio, and Parkersburg and Ravenswood, West Virginia, cared for by a local team.",
  url: `${origin}/`,
  email: "stay@mtcottages.com",
  image,
  areaServed: servedTowns.map(({ town, state }) => cityPlace(town, state)),
  containsPlace: homes.map((home) => ({ "@id": homeNodeId(homeBase(home)) })),
});

export type Crumb = { name: string; href: string };

/** Visible and structured breadcrumb trail for a town guide: Home / Locations / Marietta, Ohio. */
export const locationCrumbs = (guide: { town: string; path: string }): Crumb[] => [
  { name: "Home", href: "/" },
  { name: "Locations", href: "/locations.html" },
  { name: guide.town, href: `/${guide.path}` },
];

/** An FAQPage for questions that are shown, word for word, on the same page. */
export const faqSchema = (url: string, faqs: { q: string; a: string }[]): WithContext<FAQPageLeaf> => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${new URL(url, origin).toString()}#faq`,
  mainEntity: faqs.map(({ q, a }): QuestionLeaf => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
});

/** A BreadcrumbList that matches the visible trail; hrefs are site paths or absolute URLs. */
export const breadcrumbSchema = (trail: Crumb[]): WithContext<BreadcrumbListLeaf> => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: trail.map((crumb, index): ListItemLeaf => ({
    "@type": "ListItem",
    position: index + 1,
    name: crumb.name,
    item: new URL(crumb.href, origin).toString(),
  })),
});
