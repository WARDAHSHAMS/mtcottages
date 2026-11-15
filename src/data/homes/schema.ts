import type { AccommodationLeaf, LocationFeatureSpecificationLeaf, WithContext } from "schema-dts";
import type { HomeMicrosite } from "./types";
import { homeBase, homeHref, type HomePage } from "./links";
import { breadcrumbSchema, businessId, cityPlace, homeNodeId, origin } from "../schema";

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
 * Amenities are listed only when their status is known (never "confirm"), and
 * there is no numberOfRooms: the room plans are illustrative concepts, so the
 * only room counts published are the listed bedrooms and bathrooms.
 * Optional values are left undefined, which JSON.stringify omits.
 */
export const homeSchema = (home: HomeMicrosite): WithContext<AccommodationLeaf> => {
  const url = new URL(homeBase(home), origin).toString();
  const a = home.address;
  const street = a.kind === "street" ? a : undefined;
  const amenityFeature = home.amenities
    .flatMap((group) => group.items)
    .filter((item) => item.status !== "confirm")
    .map((item): LocationFeatureSpecificationLeaf => ({ "@type": "LocationFeatureSpecification", name: item.name, value: true }));
  return {
    "@context": "https://schema.org",
    "@type": "Accommodation",
    "@id": homeNodeId(homeBase(home)),
    name: home.name,
    description: home.summary,
    url,
    numberOfBedrooms: home.bedrooms,
    numberOfBathroomsTotal: home.bathrooms,
    occupancy: home.sleeps === undefined ? undefined : { "@type": "QuantitativeValue", maxValue: home.sleeps },
    amenityFeature: amenityFeature.length > 0 ? amenityFeature : undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: street?.streetAddress,
      addressLocality: a.locality,
      addressRegion: a.region,
      postalCode: street?.postalCode,
      addressCountry: "US",
    },
    geo: street ? { "@type": "GeoCoordinates", latitude: street.lat, longitude: street.lng } : undefined,
    containedInPlace: [cityPlace(home.town.name, home.town.state), { "@id": businessId }],
  };
};

/** Breadcrumbs matching the visible trail: Home / Town / Home name / Page. */
export const homeBreadcrumbs = (home: HomeMicrosite, page?: HomePage) =>
  breadcrumbSchema([
    { name: "Home", href: "/" },
    { name: home.town.name, href: `/${home.town.slug}/index.html` },
    { name: home.name, href: homeBase(home) },
    ...(page ? [{ name: pageTitle[page], href: homeHref(home, page) }] : []),
  ]);

/** Everything a home page publishes as JSON-LD. */
export const homePageSchema = (home: HomeMicrosite, page?: HomePage) => [homeSchema(home), homeBreadcrumbs(home, page)];
