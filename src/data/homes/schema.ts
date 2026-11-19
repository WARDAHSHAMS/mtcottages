import type { AccommodationLeaf, LocationFeatureSpecificationLeaf, WithContext } from "schema-dts";
import type { HomeMicrosite } from "./types";
import { homeBase } from "./links";
import { businessId, cityPlace, homeNodeId, origin } from "../schema";
import { offerFor } from "../terms";

/**
 * Accommodation structured data. Owner-approved homes carry a full postal
 * address and geo point; town-level homes carry only locality and region, with
 * no street, postcode or coordinates. Prices live in the separate Offer
 * (homePageSchema), which publishes only an owner-confirmed rate.
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

/**
 * Everything a home page publishes as JSON-LD, except its BreadcrumbList:
 * HomeLayout publishes that from the same trail it shows (#35), so each page
 * has exactly one. The Offer comes from src/data/terms.json and exists only
 * once the owner confirms the home's monthly rate; a published guide is not an offer.
 */
export const homePageSchema = (home: HomeMicrosite) => {
  const offer = offerFor(home.id, new URL(homeBase(home), origin).toString(), homeNodeId(homeBase(home)));
  return [homeSchema(home), ...(offer ? [offer] : [])];
};
