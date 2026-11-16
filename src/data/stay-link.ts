import { cottages, stayApplicationUrl } from "./site";

/**
 * Audience slugs, one per persona in docs/marketing/brand-and-positioning.md (P1 to P7).
 * The stay form maps each slug to its existing "What brings you here?" option, so
 * this list and `audienceStayType` in infra/azure/apply-proxy/index.html must match
 * (e2e/tests/check-dates.spec.js checks that every slug pre-selects an option).
 */
export const audiences = {
  healthcare: "Travel nurses, medical staff and residents",
  crew: "Corporate and project crews",
  insurance: "Insurance displacement",
  relocation: "Relocating families and new hires",
  "visiting-family": "Visiting families and college visitors",
  visitor: "Tourists and event visitors",
  "long-term": "Long-term furnished stays",
} as const;

export type Audience = keyof typeof audiences;

export const isAudience = (value: unknown): value is Audience =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(audiences, value);

const homeIds = new Set(cottages.map((cottage) => cottage.id));
export const isHomeId = (value: unknown): value is string => typeof value === "string" && homeIds.has(value);

/** The display name of a listed home, or undefined for anything else. */
export const homeName = (id: string | undefined) => cottages.find((cottage) => cottage.id === id)?.name;

/** Towns the stay form can pre-select from a `location` parameter. */
export const stayTowns = ["marietta", "parkersburg", "ravenswood", "racine", "grantsville"] as const;
export type StayTown = (typeof stayTowns)[number];

const SLUG = /^[a-z0-9][a-z0-9-]{0,39}$/;

/**
 * A short, stable slug for the page a CTA sits on, used as `src` so a lead and its
 * counts say which page sent it: "/" is "home", "/marietta/frederick/location.html"
 * is "marietta-frederick-location", "/travel-nurses/" is "travel-nurses".
 */
export const pageSlug = (pathname: string): string => {
  const cleaned = pathname
    .toLowerCase()
    .replace(/(^|\/)index\.html$/, "$1")
    .replace(/\.html$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const slug = (cleaned || "home").slice(0, 40).replace(/-+$/, "");
  return SLUG.test(slug) ? slug : "home";
};

export interface StayContext {
  /** Opaque house id; ignored unless it is a listed home. */
  home?: string;
  /** Persona slug; ignored unless it is in `audiences`. */
  audience?: string;
  /** Town to pre-select when no home is known. */
  town?: StayTown;
  /** Pathname of the page the link sits on; becomes the `src` slug. */
  page?: string;
}

/**
 * The one way to link to the stay form. Only allow-listed values are written, in a
 * fixed order (property, audience, location, src), so every CTA on a page about a
 * home or an audience carries that context to the form.
 */
export const stayLink = ({ home, audience, town, page }: StayContext = {}): string => {
  const params = new URLSearchParams();
  if (isHomeId(home)) params.set("property", home);
  if (isAudience(audience)) params.set("audience", audience);
  if (!isHomeId(home) && town && (stayTowns as readonly string[]).includes(town)) params.set("location", town);
  if (page !== undefined) params.set("src", pageSlug(page));
  const query = params.toString();
  return query ? `${stayApplicationUrl}?${query}` : stayApplicationUrl;
};

/** "Check dates for Frederick Cottage" on a home's pages, "Check dates" everywhere else. */
export const checkDatesLabel = (home?: string) => {
  const name = homeName(home);
  return name ? `Check dates for ${name}` : "Check dates";
};
