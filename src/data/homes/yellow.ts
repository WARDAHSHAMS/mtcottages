import type { HomeMicrosite } from "./types";
import { parkersburgArea, parkersburgDirectionsFrom, parkersburgNearby } from "./towns";
import p145 from "../../../assets/images/cottages/parkersburg-03/photo-145.avif";
import p07 from "../../../assets/images/cottages/parkersburg-03/photo-07.avif";

// Only the two exterior frames are published. The curated interior frames
// (photo-448 kitchen backsplash, photo-468 bathroom light) are maintenance
// close-ups, so the interior rooms show a visible "not published yet" gap
// until Wardah supplies finished interior photography.
const ph = (src: HomeMicrosite["hero"]["src"], alt: string, caption: string, focal?: string) => ({ src, alt, caption, ...(focal ? { focal } : {}) });

const photos = {
  side: ph(p145, "Two-story house with pale yellow siding, white trim, tall windows, and a covered porch with a white railing, seen across a green lawn under a blue sky", "Yellow Cottage from the side lawn, with its covered porch.", "50% 45%"),
  street: ph(p07, "The same pale yellow two-story house set back on a sloping lawn under a large shade tree, with its front porch, beside a quiet residential street", "Set back from the street on a sloping lawn, under a large tree.", "70% 40%"),
};

export const yellowHome: HomeMicrosite = {
  id: "yellow",
  slug: "yellow-cottage",
  name: "Yellow Cottage",
  town: { name: "Parkersburg", state: "WV", slug: "parkersburg" },
  tagline: "A two-bedroom furnished home in Parkersburg, a two-story house with a covered porch and a big lawn.",
  summary:
    "Yellow Cottage is a two-bedroom furnished home in Parkersburg. The published photos show the outside: a two-story house with pale yellow siding, a covered porch with a railing, and a wide lawn under mature trees on a quiet street. Interior photos are not published yet, so ask us and we will share what we have. It is set up for stays of a month or longer.",
  address: parkersburgArea,
  bedrooms: 2,
  priceGuide: "$2,295/month",
  hero: photos.side,
  highlights: [
    { title: "A covered porch", body: "A porch with a white railing gives you a sheltered place to sit outside.", photo: photos.side },
    { title: "Room around the house", body: "The house sits back from a quiet residential street on a wide, sloping lawn under a large shade tree.", photo: photos.street },
    { title: "Two bedrooms, furnished", body: "Listed as a furnished two-bedroom home with a full kitchen. Ask us for interior photos before you decide." },
  ],
  facts: [
    { label: "Town", value: "Parkersburg, WV. The street address is shared once you inquire.", status: "listed" },
    { label: "Bedrooms", value: "2", status: "listed" },
    { label: "Monthly guide", value: "$2,295/month, the published guide for a two-bedroom home. Confirm the current rate for your dates.", status: "listed" },
    { label: "Floors", value: "Two-story house", status: "photographed" },
    { label: "Porch", value: "Covered porch with a railing", status: "photographed" },
    { label: "Furnishing", value: "Furnished rooms", status: "listed" },
    { label: "Internet", value: "Fiber-optic internet", status: "listed" },
    { label: "Bathrooms", value: "Number of bathrooms", status: "confirm" },
    { label: "Interior photos", value: "Not published yet; ask us for current photos", status: "confirm" },
    { label: "Laundry", value: "Laundry access is listed; whether it is in the home is to be confirmed", status: "confirm" },
    { label: "Parking", value: "Parking arrangement", status: "confirm" },
    { label: "Utilities", value: "What is included in the monthly rate", status: "confirm" },
    { label: "Pets", value: "Pet policy", status: "confirm" },
  ],
  rooms: [
    {
      slug: "outside",
      name: "Outside & porch",
      summary: "A two-story house with pale yellow siding, a covered porch, and a wide lawn.",
      photos: [photos.side, photos.street],
      notes: [
        { text: "Two stories, pale yellow siding, white trim, and tall windows.", status: "photographed" },
        { text: "Covered porch with a white railing.", status: "listed" },
        { text: "Wide lawn and a large shade tree, beside a quiet residential street.", status: "photographed" },
        { text: "Step count at the entrance, for guests who need a step-free way in.", status: "confirm" },
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
      slug: "bedrooms",
      name: "Bedrooms",
      summary: "Two private bedrooms are listed.",
      photos: [],
      notes: [
        { text: "Two private bedrooms.", status: "listed" },
        { text: "Bed sizes and which floor each bedroom is on.", status: "confirm" },
      ],
    },
    {
      slug: "bathroom",
      name: "Bathroom",
      summary: "Bathroom details are still to confirm.",
      photos: [],
      notes: [{ text: "Number of bathrooms, and tub or shower.", status: "confirm" }],
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
        { name: "Towels and linens provided", status: "confirm" },
      ],
    },
    {
      group: "Living",
      items: [
        { name: "Furnished rooms", status: "listed" },
        { name: "Living room", status: "confirm" },
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
        { name: "Covered porch", status: "listed" },
        { name: "Lawn and shade tree", status: "photographed" },
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
        name: "Ground floor (illustrative)",
        rooms: [
          { id: "porch", label: "Covered porch", kind: "porch", x: 0, y: 0, w: 22, h: 7 },
          { id: "living", label: "Living room", kind: "living", x: 0, y: 7, w: 14, h: 13 },
          { id: "stairs", label: "Stairs", kind: "stairs", x: 14, y: 7, w: 6, h: 13 },
          { id: "kitchen", label: "Kitchen", kind: "kitchen", x: 20, y: 7, w: 12, h: 13 },
        ],
      },
      {
        name: "Upper floor (illustrative)",
        rooms: [
          { id: "bed1", label: "Bedroom one", kind: "bedroom", x: 0, y: 7, w: 14, h: 13 },
          { id: "hall", label: "Hall", kind: "hall", x: 14, y: 7, w: 6, h: 13 },
          { id: "bed2", label: "Bedroom two", kind: "bedroom", x: 20, y: 7, w: 12, h: 8 },
          { id: "bath", label: "Bathroom", kind: "bath", x: 20, y: 15, w: 12, h: 5 },
        ],
      },
    ],
    note: "Illustrative concept only, not a measured plan. Only the two stories and the covered porch come from the photos. The room arrangement, the living room, and which floor the bedrooms and bathroom are on are guesses until confirmed.",
  },
  concepts: [],
  nearby: parkersburgNearby,
  directionsFrom: parkersburgDirectionsFrom,
};
