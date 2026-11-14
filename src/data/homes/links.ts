import { stayApplicationUrl } from "../site";
import type { HomeMicrosite, FactStatus, NearbyKind, PlanRoomKind } from "./types";

/** True only for homes whose street address the owner approved for publication. */
export const hasStreetAddress = (home: HomeMicrosite) => home.address.kind === "street";

/** The full street address for approved homes, otherwise just "Town, ST". */
export const fullAddress = (home: HomeMicrosite) => {
  const a = home.address;
  return a.kind === "street" ? `${a.streetAddress}, ${a.locality}, ${a.region} ${a.postalCode}` : `${a.locality}, ${a.region}`;
};

/** "at 200 Henrietta St, …" for a street address, "in Ravenswood, WV" for a town-level home. */
export const addressPhrase = (home: HomeMicrosite) => `${hasStreetAddress(home) ? "at" : "in"} ${fullAddress(home)}`;

export const privateAddressNote = "The street address is shared once you inquire.";

export const homeBase = (home: HomeMicrosite) => `/${home.town.slug}/${home.slug}/`;

/** Directory URL for the index page, .html files for the rest (build.format "preserve"). */
export const homeHref = (home: HomeMicrosite, page: "index" | "tour" | "plan" | "amenities" | "location" = "index") =>
  page === "index" ? homeBase(home) : `${homeBase(home)}${page}.html`;

export const inquiryUrl = (id: string) => `${stayApplicationUrl}?property=${encodeURIComponent(id)}`;

export const googleDirectionsTo = (address: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

export const googleDirectionsFrom = (origin: string, address: string) =>
  `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(address)}`;

export const googleSearch = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

export const appleMapsTo = (address: string) => `https://maps.apple.com/?daddr=${encodeURIComponent(address)}&dirflg=d`;

/** Street homes get a close view with a pin; town-level homes get a wide town view with no pin. */
export const osmEmbedUrl = (lat: number, lng: number, pin = true) => {
  const dLat = pin ? 0.006 : 0.03;
  const dLng = pin ? 0.009 : 0.045;
  const bbox = [lng - dLng, lat - dLat, lng + dLng, lat + dLat].map((n) => n.toFixed(6)).join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${pin ? `&marker=${lat}%2C${lng}` : ""}`;
};

export const osmLargeUrl = (lat: number, lng: number, pin = true) =>
  pin ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}` : `https://www.openstreetmap.org/#map=14/${lat}/${lng}`;

export const statusLabel: Record<FactStatus, string> = {
  confirmed: "Confirmed",
  listed: "Listed",
  photographed: "In photos",
  confirm: "Confirm on inquiry",
};

export const statusHelp: Record<FactStatus, string> = {
  confirmed: "The owner has confirmed this detail.",
  listed: "Part of the home's published Mt Cottages listing.",
  photographed: "Visible in the published photographs.",
  confirm: "Not yet confirmed. Ask us before you rely on it.",
};

export const nearbyKindLabel: Record<NearbyKind, string> = {
  health: "Health care",
  grocery: "Groceries",
  food: "Food and coffee",
  park: "Parks and outdoors",
  school: "Schools",
  transit: "Getting around",
  shopping: "Shopping",
  civic: "Community and services",
};

export const nearbyKindOrder: NearbyKind[] = ["health", "grocery", "food", "shopping", "park", "school", "transit", "civic"];

export const planKindLabel: Record<PlanRoomKind, string> = {
  bedroom: "Bedroom",
  bath: "Bath",
  kitchen: "Kitchen",
  living: "Living",
  dining: "Dining",
  laundry: "Laundry",
  porch: "Porch",
  hall: "Hall",
  office: "Office",
  stairs: "Stairs",
  other: "Other",
};

/** Light fills so dark label text keeps AA contrast. */
export const planKindColor: Record<PlanRoomKind, string> = {
  bedroom: "#dbe5f1",
  bath: "#d3ebe7",
  kitchen: "#f4dfc6",
  living: "#e1eadd",
  dining: "#f0e6c4",
  laundry: "#e6dcef",
  porch: "#ebe5d3",
  hall: "#f0f0e8",
  office: "#dde8cf",
  stairs: "#d8d8d0",
  other: "#ebe9e1",
};
