import type { HomeMicrosite } from "./types";
import { homeBase } from "./links";

/**
 * Accommodation structured data. Owner-approved homes carry a full postal
 * address and geo point; town-level homes carry only locality and region, with
 * no street, postcode or coordinates. No Offer: prices are not confirmed.
 */
export const homeSchema = (home: HomeMicrosite) => {
  const url = new URL(homeBase(home), "https://mtcottages.com").toString();
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
