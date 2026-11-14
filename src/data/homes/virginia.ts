import type { HomeMicrosite } from "./types";
import { ravenswoodArea, ravenswoodDirectionsFrom, ravenswoodNearby } from "./towns";
import p117 from "../../../assets/images/cottages/ravenswood-02/photo-117.avif";
import p53 from "../../../assets/images/cottages/ravenswood-02/photo-53.avif";
import p55 from "../../../assets/images/cottages/ravenswood-02/photo-55.avif";
import p27 from "../../../assets/images/cottages/ravenswood-02/photo-27.avif";
import p116 from "../../../assets/images/cottages/ravenswood-02/photo-116.avif";

// Virginia's street address is not approved, so the location is town-level
// only. The current photos show the rooms only partly furnished; the page says
// so rather than implying a finished, fully furnished interior. The kitchen
// (photo-54) and sunroom (photo-77) frames are left out: both are mid-cleanup
// maintenance frames (cleaning supplies, an uncovered electrical box, a torn-out
// outlet and a shop-vac), so the kitchen shows its photo gap and the sunroom,
// which nothing else shows, is not claimed.
const ph = (src: HomeMicrosite["hero"]["src"], alt: string, caption: string, focal?: string) => ({ src, alt, caption, ...(focal ? { focal } : {}) });

const photos = {
  fireplace: ph(p117, "Room with deep red walls, a white-painted brick fireplace with a wide mantel, built-in white bookshelves beside it, and wood floors", "A white brick fireplace and built-in shelves against deep red walls.", "45% 50%"),
  powder: ph(p53, "Small powder room seen through an open paneled door, with a white vanity sink, an octagonal mirror, a three-light fixture and a white tile floor", "A powder room with a vanity sink and an octagonal mirror."),
  dining: ph(p55, "Sunny dining room with toile wallpaper, a wooden farmhouse table with four spindle-back chairs, a tall double window, and wood floors", "A sunny dining room with toile wallpaper and a farmhouse table."),
  stairs: ph(p27, "Curved staircase with a dark wood handrail, turned balusters and a newel post, white risers, green treads, and yellow walls", "A curved staircase with a dark wood handrail."),
  room: ph(p116, "Corner of a room with yellow walls, a tall double window looking onto shrubs, a carved wood chest of drawers, and wood floors", "A sunny corner with a tall double window and a carved chest of drawers."),
};

export const virginiaHome: HomeMicrosite = {
  id: "virginia",
  slug: "virginia-cottage",
  name: "Virginia Cottage",
  town: { name: "Ravenswood", state: "WV", slug: "ravenswood" },
  tagline: "A two-bedroom home in Ravenswood with a brick fireplace, a curved staircase, and a sunny dining room.",
  summary:
    "Virginia Cottage is a two-bedroom home in Ravenswood with older-house character: a white brick fireplace with built-in shelves, a curved staircase with a dark wood handrail, and a dining room with toile wallpaper. The current photos show the rooms only partly furnished, so ask us how the home is set up for your dates. It is offered for stays of a month or longer.",
  address: ravenswoodArea,
  bedrooms: 2,
  priceGuide: "$2,295/month",
  hero: photos.fireplace,
  highlights: [
    { title: "Fireplace and built-in shelves", body: "A wide white brick fireplace sits beside built-in bookshelves, against deep red walls.", photo: photos.fireplace },
    { title: "A curved staircase", body: "A curved staircase with a dark wood handrail and turned balusters leads upstairs.", photo: photos.stairs },
    { title: "A sunny dining room", body: "A farmhouse table with four chairs stands by a tall double window, framed by toile wallpaper.", photo: photos.dining },
  ],
  facts: [
    { label: "Town", value: "Ravenswood, WV. The street address is shared once you inquire.", status: "listed" },
    { label: "Bedrooms", value: "2", status: "listed" },
    { label: "Monthly guide", value: "$2,295/month, the published guide for a two-bedroom home. Confirm the current rate for your dates.", status: "listed" },
    { label: "Floors", value: "More than one floor, with a staircase", status: "photographed" },
    { label: "Furnishing", value: "Listed as furnished; the current photos show the rooms only partly furnished", status: "confirm" },
    { label: "Internet", value: "Fiber-optic internet", status: "listed" },
    { label: "Fireplace", value: "A brick fireplace is shown; whether it can be used is to be confirmed", status: "confirm" },
    { label: "Bathrooms", value: "A vanity is photographed; number of bathrooms and showers to be confirmed", status: "confirm" },
    { label: "Laundry", value: "Laundry access is listed; whether it is in the home is to be confirmed", status: "confirm" },
    { label: "Parking", value: "Parking arrangement", status: "confirm" },
    { label: "Utilities", value: "What is included in the monthly rate", status: "confirm" },
    { label: "Pets", value: "Pet policy", status: "confirm" },
  ],
  rooms: [
    {
      slug: "fireplace-room",
      name: "Fireplace room",
      summary: "A white brick fireplace with a wide mantel and built-in shelves, against deep red walls.",
      photos: [photos.fireplace],
      notes: [
        { text: "White-painted brick fireplace, wide mantel, and built-in bookshelves.", status: "photographed" },
        { text: "Fireplace feature is part of the listing.", status: "listed" },
        { text: "Whether the fireplace can be used, and how the room is furnished.", status: "confirm" },
      ],
    },
    {
      slug: "dining",
      name: "Dining room",
      summary: "A farmhouse table with four chairs by a tall double window, with toile wallpaper.",
      photos: [photos.dining],
      notes: [
        { text: "Wooden farmhouse table with four spindle-back chairs.", status: "photographed" },
        { text: "Tall double window and wood floors.", status: "photographed" },
      ],
    },
    {
      slug: "kitchen",
      name: "Kitchen",
      summary: "A full kitchen is part of the listing. A new photo is still to come.",
      photos: [],
      notes: [
        { text: "Full kitchen.", status: "listed" },
        { text: "Appliances, cookware and dishes.", status: "confirm" },
      ],
    },
    {
      slug: "stairs",
      name: "Staircase & upstairs",
      summary: "A curved staircase, and a sunny room with a carved chest of drawers.",
      photos: [photos.stairs, photos.room],
      notes: [
        { text: "Curved staircase with a dark wood handrail and turned balusters.", status: "photographed" },
        { text: "A room with yellow walls, a tall double window and a carved chest of drawers.", status: "photographed" },
        { text: "Which rooms are the two bedrooms, and the bed sizes. No bedroom with a bed is photographed yet.", status: "confirm" },
      ],
    },
    {
      slug: "bathroom",
      name: "Bathroom",
      summary: "A powder room with a vanity sink and an octagonal mirror.",
      photos: [photos.powder],
      notes: [
        { text: "Powder room with a vanity sink, an octagonal mirror and a white tile floor.", status: "photographed" },
        { text: "Shower or tub, and the number of bathrooms.", status: "confirm" },
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
        { name: "Private bedrooms", status: "listed" },
        { name: "Beds and bed sizes", status: "confirm" },
        { name: "Towels and linens provided", status: "confirm" },
      ],
    },
    {
      group: "Living",
      items: [
        { name: "Fireplace feature", status: "listed" },
        { name: "Built-in bookshelves", status: "photographed" },
        { name: "Dining table with four chairs", status: "photographed" },
        { name: "Sofa and living-room seating", status: "confirm" },
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
      group: "Outdoors & parking",
      items: [{ name: "Parking", status: "confirm" }],
    },
    {
      group: "Connectivity",
      items: [{ name: "Fiber-optic internet", status: "listed" }],
    },
    {
      group: "Support",
      items: [{ name: "Guest support", status: "listed" }],
    },
  ],
  plan: {
    floors: [
      {
        name: "Ground floor (illustrative)",
        rooms: [
          { id: "fire", label: "Fireplace room", kind: "living", x: 0, y: 0, w: 20, h: 13 },
          { id: "powder", label: "Bathroom", kind: "bath", x: 20, y: 0, w: 12, h: 6 },
          { id: "stairs", label: "Stairs", kind: "stairs", x: 20, y: 6, w: 12, h: 7 },
          { id: "kitchen", label: "Kitchen", kind: "kitchen", x: 0, y: 13, w: 14, h: 9 },
          { id: "dining", label: "Dining room", kind: "dining", x: 14, y: 13, w: 18, h: 9 },
        ],
      },
      {
        name: "Upper floor (illustrative)",
        rooms: [
          { id: "bed1", label: "Bedroom one", kind: "bedroom", x: 0, y: 0, w: 14, h: 13 },
          { id: "hall", label: "Hall", kind: "hall", x: 14, y: 0, w: 6, h: 13 },
          { id: "bed2", label: "Bedroom two", kind: "bedroom", x: 20, y: 0, w: 12, h: 13 },
        ],
      },
    ],
    note: "Illustrative concept only, not a measured plan. Only the staircase, and so a second floor, comes from the photos. Which floor each room is on, the bedrooms' positions, the room sizes and the number of bathrooms are guesses until confirmed.",
  },
  concepts: [],
  nearby: ravenswoodNearby,
  directionsFrom: ravenswoodDirectionsFrom,
};
