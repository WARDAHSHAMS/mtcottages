import type { HomeMicrosite } from "./types";
import { ravenswoodArea, ravenswoodDirectionsFrom, ravenswoodNearby } from "./towns";
import p297 from "../../../assets/images/cottages/ravenswood-01/photo-297.avif";
import p125 from "../../../assets/images/cottages/ravenswood-01/photo-125.avif";
import p374 from "../../../assets/images/cottages/ravenswood-01/photo-374.avif";
import p165 from "../../../assets/images/cottages/ravenswood-01/photo-165.avif";
import p108 from "../../../assets/images/cottages/ravenswood-01/photo-108.avif";
import p03 from "../../../assets/images/cottages/ravenswood-01/photo-03.avif";

// Excluded: photo-01 (porch in need of repair), photo-292 (cluttered cooktop
// corner) and photo-263 (dim bathroom ceiling). Walnut's street address is not
// approved, so the location is town-level only.
const ph = (src: HomeMicrosite["hero"]["src"], alt: string, caption: string, focal?: string) => ({ src, alt, caption, ...(focal ? { focal } : {}) });

const photos = {
  bedroom: ph(p297, "Bedroom with a dark wood four-poster bed in red bedding, a dresser with a mirror, and warm curtains", "The four-poster bedroom.", "50% 55%"),
  dresser: ph(p125, "Bedroom with a large carved wood dresser and mirror, a four-poster bedpost, a wall of patterned gold-and-green wallpaper, and an open doorway through to another room with a made bed and wood floors", "A carved dresser and mirror, with another furnished room through the doorway."),
  fireplace: ph(p374, "Living room with a fireplace mantel and built-in shelving", "A fireplace mantel with built-in shelves."),
  reading: ph(p165, "Living room reading corner with a green armchair beside a curtained window", "A green armchair by the window for reading."),
  bath: ph(p108, "Bathroom vanity with a sink and a mirror", "The bathroom vanity and mirror."),
  yard: ph(p03, "Side yard with a dogwood tree in autumn colour, a lawn, a chain-link fence and a metal shed beyond, beside the white siding of the house", "The side yard, with a dogwood tree and a fenced lawn.", "40% 50%"),
};

export const walnutHome: HomeMicrosite = {
  id: "walnut",
  slug: "walnut-cottage",
  name: "Walnut Cottage",
  town: { name: "Ravenswood", state: "WV", slug: "ravenswood" },
  tagline: "A one-bedroom furnished home in Ravenswood with a four-poster bed, a fireplace mantel, and a reading corner.",
  summary:
    "Walnut Cottage is a furnished one-bedroom home in Ravenswood with classic details. The photos show a bedroom with a four-poster bed and a carved dresser, a living room with a fireplace mantel, built-in shelves and a reading chair, a bathroom vanity, and a side yard with a dogwood tree. It is set up for stays of a month or longer in a quieter river town.",
  address: ravenswoodArea,
  bedrooms: 1,
  priceGuide: "$1,895/month",
  hero: photos.bedroom,
  highlights: [
    { title: "A four-poster bedroom", body: "A dark wood four-poster bed and a large carved dresser give the bedroom real character.", photo: photos.dresser },
    { title: "Fireplace mantel and built-ins", body: "The living room has a fireplace mantel with built-in shelving, and a green armchair by the window for reading.", photo: photos.fireplace },
    { title: "A yard with a dogwood", body: "A side lawn with a dogwood tree and a fenced area gives you a little outdoor space.", photo: photos.yard },
  ],
  facts: [
    { label: "Town", value: "Ravenswood, WV. The street address is shared once you inquire.", status: "listed" },
    { label: "Bedrooms", value: "1", status: "listed" },
    { label: "Monthly guide", value: "$1,895/month, the published guide for a one-bedroom home. Confirm the current rate for your dates.", status: "listed" },
    { label: "Bathrooms", value: "Number of bathrooms", status: "confirm" },
    { label: "Furnishing", value: "Furnished one-bedroom layout", status: "listed" },
    { label: "Internet", value: "Fiber-optic internet", status: "listed" },
    { label: "Setting", value: "Quiet setting", status: "listed" },
    { label: "Fireplace", value: "A fireplace mantel is shown; whether the fireplace can be used is to be confirmed", status: "confirm" },
    { label: "Laundry", value: "Laundry access is listed; whether it is in the home is to be confirmed", status: "confirm" },
    { label: "Parking", value: "Parking arrangement", status: "confirm" },
    { label: "Utilities", value: "What is included in the monthly rate", status: "confirm" },
    { label: "Pets", value: "Pet policy", status: "confirm" },
  ],
  rooms: [
    {
      slug: "bedroom",
      name: "Bedroom",
      summary: "A four-poster bed, a large carved dresser with a mirror, and patterned wallpaper.",
      photos: [photos.bedroom, photos.dresser],
      notes: [
        { text: "Four-poster bed in red bedding, a carved dresser with a mirror, and curtains.", status: "photographed" },
        { text: "Wood floors and a wall of patterned gold-and-green wallpaper.", status: "photographed" },
        { text: "A second made bed shows through the doorway, though the home is listed as one bedroom. Confirm the sleeping arrangement.", status: "confirm" },
        { text: "Bed size.", status: "confirm" },
      ],
    },
    {
      slug: "living",
      name: "Living room",
      summary: "A fireplace mantel with built-in shelving and a green armchair by the window.",
      photos: [photos.fireplace, photos.reading],
      notes: [
        { text: "Fireplace mantel and built-in shelving.", status: "photographed" },
        { text: "Green armchair beside a curtained window.", status: "photographed" },
        { text: "Classic living details are part of the listing.", status: "listed" },
        { text: "Sofa, TV and whether the fireplace works.", status: "confirm" },
      ],
    },
    {
      slug: "kitchen",
      name: "Kitchen",
      summary: "Listed as a full kitchen.",
      photos: [],
      notes: [
        { text: "Full kitchen.", status: "listed" },
        { text: "Appliances, cookware and dishes.", status: "confirm" },
      ],
    },
    {
      slug: "bathroom",
      name: "Bathroom",
      summary: "A vanity with a sink and a mirror.",
      photos: [photos.bath],
      notes: [
        { text: "Vanity with a sink and a mirror.", status: "photographed" },
        { text: "Shower or tub, and the number of bathrooms.", status: "confirm" },
      ],
    },
    {
      slug: "yard",
      name: "Yard",
      summary: "A side lawn with a dogwood tree, a chain-link fence, and a shed.",
      photos: [photos.yard],
      notes: [
        { text: "Side lawn with a dogwood tree and a fenced area.", status: "photographed" },
        { text: "Whether guests can use the yard and the shed.", status: "confirm" },
      ],
    },
  ],
  amenities: [
    {
      group: "Kitchen",
      items: [
        { name: "Full kitchen", status: "listed" },
        { name: "Cookware and dishes", status: "confirm" },
      ],
    },
    {
      group: "Sleeping",
      items: [
        { name: "Furnished one-bedroom layout", status: "listed" },
        { name: "Four-poster bed and carved dresser", status: "photographed" },
        { name: "Towels and linens provided", status: "confirm" },
      ],
    },
    {
      group: "Living",
      items: [
        { name: "Classic living details", status: "listed" },
        { name: "Fireplace mantel and built-in shelving", status: "photographed" },
        { name: "Reading chair", status: "photographed" },
        { name: "Storage", status: "listed" },
      ],
    },
    {
      group: "Laundry & utilities",
      items: [
        { name: "Laundry access", status: "listed" },
        { name: "Utilities included", status: "confirm" },
      ],
    },
    {
      group: "Outdoors",
      items: [
        { name: "Side yard with a dogwood tree", status: "photographed" },
        { name: "Parking", status: "confirm" },
      ],
    },
    {
      group: "Connectivity",
      items: [{ name: "Fiber-optic internet", status: "listed" }],
    },
    {
      group: "Support",
      items: [
        { name: "Guest support", status: "listed" },
        { name: "Quiet setting", status: "listed" },
      ],
    },
  ],
  plan: {
    floors: [
      {
        name: "Illustrative layout",
        rooms: [
          { id: "living", label: "Living room", kind: "living", x: 0, y: 0, w: 16, h: 14 },
          { id: "kitchen", label: "Kitchen", kind: "kitchen", x: 16, y: 0, w: 12, h: 10 },
          { id: "bath", label: "Bathroom", kind: "bath", x: 16, y: 10, w: 12, h: 6 },
          { id: "bed", label: "Bedroom", kind: "bedroom", x: 0, y: 14, w: 16, h: 14 },
          { id: "room2", label: "Second room (to confirm)", kind: "other", x: 16, y: 16, w: 12, h: 12 },
        ],
      },
    ],
    note: "Illustrative concept only, not a measured plan. It uses the rooms shown in the photos plus the listed kitchen; sizes, arrangement and number of floors are guesses until confirmed. Only the doorway from the bedroom to another furnished room is taken from a photo.",
  },
  concepts: [],
  nearby: ravenswoodNearby,
  directionsFrom: ravenswoodDirectionsFrom,
};
