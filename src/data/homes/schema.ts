import type { HomeMicrosite } from "./types";
import { homeBase, homeHref, type HomePage } from "./links";

const origin = "https://mtcottages.com";

const pageTitle: Record<HomePage, string> = {
  tour: "Tour",
  plan: "Plan & 3D",
  amenities: "Amenities",
  location: "Location",
  guide: "Guide",
};

/**
 * Accommodation structured data. Owner-approved homes carry a full postal
 * address and geo point; town-level homes carry only locality and region, with
 * no street, postcode or coordinates. No Offer: prices are not confirmed.
 */
export const homeSchema = (home: HomeMicrosite) => {
  const url = new URL(homeBase(home), origin).toString();
  const a = home.address;
  return {
    "@context": "https://schema.org",
    "@type": "Accommodation",
    "@id": `${url}#home`,
    name: home.name,
    description: home.summary,
    url,
    numberOfBedrooms: home.bedrooms,
    ...(home.bathrooms !== undefined && { numberOfBathroomsTotal: home.bathrooms }),
    ...(home.sleeps !== undefined && { occupancy: { "@type": "QuantitativeValue", maxValue: home.sleeps } }),
    address: {
      "@type": "PostalAddress",
      ...(a.kind === "street" && { streetAddress: a.streetAddress }),
      addressLocality: a.locality,
      addressRegion: a.region,
      ...(a.kind === "street" && { postalCode: a.postalCode }),
      addressCountry: "US",
    },
    ...(a.kind === "street" && { geo: { "@type": "GeoCoordinates", latitude: a.lat, longitude: a.lng } }),
    containedInPlace: { "@type": "Place", name: "Mid-Ohio Valley" },
  };
};

/** Breadcrumbs matching the visible trail: Home / Town / Home name / Page. */
export const homeBreadcrumbs = (home: HomeMicrosite, page?: HomePage) => {
  const trail = [
    { name: "Home", url: `${origin}/` },
    { name: home.town.name, url: `${origin}/${home.town.slug}/index.html` },
    { name: home.name, url: new URL(homeBase(home), origin).toString() },
    ...(page ? [{ name: pageTitle[page], url: new URL(homeHref(home, page), origin).toString() }] : []),
  ];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({ "@type": "ListItem", position: index + 1, name: crumb.name, item: crumb.url })),
  };
};

/** Everything a home page publishes as JSON-LD. */
export const homePageSchema = (home: HomeMicrosite, page?: HomePage) => [homeSchema(home), homeBreadcrumbs(home, page)];
