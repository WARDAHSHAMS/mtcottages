import type { HomeMicrosite } from "./types";
import { parkersburgArea, parkersburgDirectionsFrom, parkersburgNearby } from "./towns";
import p49 from "../../../assets/images/cottages/parkersburg-02/photo-49.avif";
import p50 from "../../../assets/images/cottages/parkersburg-02/photo-50.avif";
import p38 from "../../../assets/images/cottages/parkersburg-02/photo-38.avif";
import kitchen from "../../../assets/images/cottages/parkersburg-02/buck-kitchen.jpg";
import bed from "../../../assets/images/cottages/parkersburg-02/buck-bedroom.jpg";
import bedAlt from "../../../assets/images/cottages/parkersburg-02/buck-bedroom-alt.jpg";
import bath from "../../../assets/images/cottages/parkersburg-02/buck-bathroom.jpg";
import porch from "../../../assets/images/cottages/parkersburg-02/photo-45.jpg";

// Excluded from the public set: photo-09 (street panorama) and photo-23 (front
// of house with a visible house number). Buck's street address is not approved.
const ph = (src: HomeMicrosite["hero"]["src"], alt: string, caption: string, focal?: string) => ({ src, alt, caption, ...(focal ? { focal } : {}) });

const photos = {
  living: ph(p49, "Living room with a sage-green reclining sofa and mixed cushions, a pine coffee table on a striped rug, a large framed mirror, rose-coloured curtains, and a glowing floor lamp", "The living room, with a reclining sofa and warm lamplight.", "55% 55%"),
  livingWide: ph(p50, "Living room seen straight on, with the reclining sofa under a window, framed floral paintings, amber lamps on a floor stand and a side table, and dark wood floors", "The same room straight on, with two lamps and framed floral art."),
  bed: ph(bed, "Bedroom with a red-and-black patterned comforter, folded towels, a large wall-mounted TV, a wall clock, brown curtains, and an open door into a bathroom", "A made bed, a wall TV, and a door straight into the bathroom."),
  bedAlt: ph(bedAlt, "The same bedroom from the corner, with the red-and-black comforter, a cream throw, a wooden nightstand with a lamp, and a window with blinds and curtains", "The bed from the corner, with a nightstand and lamp."),
  desk: ph(p38, "Room with deep blue walls, two tall windows with blinds, a wooden desk with a monitor and keyboard, a blue upholstered desk chair, and a bed with a floral comforter", "A blue room with a desk by the window and a second bed."),
  kitchen: ph(kitchen, "Compact kitchen with pale blue cabinets, a double stainless sink, granite-look counters, a toaster oven, a stainless refrigerator, and a microwave on top", "Pale blue cabinets, a double sink, and a full-size refrigerator."),
  bath: ph(bath, "Bathroom with a tub and shower behind a mint curtain, a grab bar, a toilet with a cabinet above, a white vanity with a mirror cabinet, and a glass-block window", "Tub and shower, a vanity, and a glass-block window for daylight."),
  porch: ph(porch, "Covered front porch seen from the open front door, with dark wood posts and railings, a painted ceiling, and autumn trees beyond", "The covered front porch, seen from the front door.", "40% 50%"),
};

export const buckHome: HomeMicrosite = {
  id: "buck",
  slug: "buck-cottage",
  legacySlugs: ["buck-apartment-1"],
  name: "Buck Cottage",
  town: { name: "Parkersburg", state: "WV", slug: "parkersburg" },
  tagline: "A one-bedroom furnished home in Parkersburg with a lamplit living room and a compact, ready kitchen.",
  summary:
    "Buck Cottage is a furnished one-bedroom home in Parkersburg, sized for one person or a couple. The photos show a living room with a reclining sofa, a bedroom with a wall-mounted TV and a door into the bathroom, a compact kitchen with a full-size refrigerator, and a full bathroom with a tub and shower. It is set up for stays of a month or longer.",
  address: parkersburgArea,
  bedrooms: 1,
  hero: photos.living,
  highlights: [
    { title: "A living room to unwind in", body: "A reclining sofa, a coffee table, and warm lamps make an easy place to end the day.", photo: photos.livingWide },
    { title: "Bedroom with its own bathroom door", body: "The bedroom has a made bed, a wall-mounted TV, and a door that opens straight into the bathroom.", photo: photos.bed },
    { title: "A compact kitchen, ready to use", body: "A double sink, a toaster oven, a microwave, and a full-size refrigerator cover everyday meals.", photo: photos.kitchen },
  ],
  facts: [
    { label: "Town", value: "Parkersburg, WV. The street address is shared once you inquire.", status: "listed" },
    { label: "Bedrooms", value: "1", status: "listed" },
    { label: "Bathrooms", value: "One full bathroom with tub and shower is photographed; total count to be confirmed", status: "confirm" },
    { label: "Furnishing", value: "Furnished one-bedroom layout", status: "listed" },
    { label: "Internet", value: "Fiber-optic internet", status: "listed" },
    { label: "Setting", value: "Quiet setting", status: "listed" },
    { label: "Laundry", value: "Laundry access is listed; whether it is in the home is to be confirmed", status: "confirm" },
    { label: "Parking", value: "Parking options are listed; the arrangement is to be confirmed", status: "confirm" },
  ],
  rooms: [
    {
      slug: "living",
      name: "Living room",
      summary: "A reclining sofa, a pine coffee table, framed floral art, and warm lamps.",
      photos: [photos.living, photos.livingWide],
      notes: [
        { text: "Reclining sofa with cushions and a throw, a coffee table on a striped rug, and a large mirror.", status: "photographed" },
        { text: "Floor lamp and table lamp, framed paintings, and two windows with blinds.", status: "photographed" },
        { text: "Living room is part of the home's listing.", status: "listed" },
        { text: "Whether there is a TV in the living room.", status: "confirm" },
      ],
    },
    {
      slug: "bedroom",
      name: "Bedroom",
      summary: "A made bed, a wall-mounted TV, a nightstand, and a door into the bathroom.",
      photos: [photos.bed, photos.bedAlt],
      notes: [
        { text: "Made bed with towels set out, a nightstand with a lamp, and a tall gold mirror.", status: "photographed" },
        { text: "Wall-mounted TV with a sound bar, and track lighting.", status: "photographed" },
        { text: "A door from the bedroom opens into the bathroom.", status: "photographed" },
        { text: "Bed size.", status: "confirm" },
      ],
    },
    {
      slug: "desk-room",
      name: "Desk room",
      summary: "A blue room with a desk, a desk chair, two tall windows, and a second bed.",
      photos: [photos.desk],
      notes: [
        { text: "Wooden desk with a monitor and keyboard, and a blue upholstered desk chair.", status: "photographed" },
        { text: "A bed with a floral comforter.", status: "photographed" },
        { text: "The home is listed as one bedroom. Confirm whether this room is part of the stay, and whether it is a second bedroom or a study.", status: "confirm" },
      ],
    },
    {
      slug: "kitchen",
      name: "Kitchen",
      summary: "Pale blue cabinets, a double sink, a toaster oven, a microwave, and a full-size refrigerator.",
      photos: [photos.kitchen],
      notes: [
        { text: "Full kitchen.", status: "listed" },
        { text: "Double stainless sink, toaster oven, microwave, and stainless refrigerator.", status: "photographed" },
        { text: "A cooktop or range is not shown in the photo.", status: "confirm" },
        { text: "Cookware and dishes supplied.", status: "confirm" },
      ],
    },
    {
      slug: "bathroom",
      name: "Bathroom",
      summary: "A tub and shower with a grab bar, a vanity, and a glass-block window.",
      photos: [photos.bath],
      notes: [
        { text: "Tub with shower and curtain, a grab bar, a toilet, and a white vanity with a mirror cabinet.", status: "photographed" },
        { text: "Glass-block window and wall storage cabinet.", status: "photographed" },
        { text: "Whether there is more than one bathroom.", status: "confirm" },
      ],
    },
    {
      slug: "porch",
      name: "Covered porch",
      summary: "A covered front porch with wood railings, just outside the front door.",
      photos: [photos.porch],
      notes: [
        { text: "Covered front porch with dark wood posts and railings, seen from the front door.", status: "photographed" },
        { text: "Whether there is porch seating.", status: "confirm" },
      ],
    },
  ],
  amenities: [
    {
      group: "Kitchen",
      items: [
        { name: "Full kitchen", status: "listed" },
        { name: "Refrigerator, microwave and toaster oven", status: "photographed" },
        { name: "Double sink", status: "photographed" },
        { name: "Cooktop or range", status: "confirm" },
        { name: "Cookware and dishes", status: "confirm" },
      ],
    },
    {
      group: "Sleeping",
      items: [
        { name: "Furnished one-bedroom layout", status: "listed" },
        { name: "Made bed with nightstand and lamp", status: "photographed" },
        { name: "Wall-mounted TV in the bedroom", status: "photographed" },
        { name: "Towels and linens provided", status: "confirm" },
      ],
    },
    {
      group: "Living",
      items: [
        { name: "Living room", status: "listed" },
        { name: "Reclining sofa and coffee table", status: "photographed" },
        { name: "Desk and desk chair", status: "photographed" },
      ],
    },
    {
      group: "Laundry & utilities",
      items: [
        { name: "Laundry access", status: "listed" },
        { name: "Washer and dryer in the home", status: "confirm" },
        { name: "Utilities included", status: "confirmed" },
      ],
    },
    {
      group: "Outdoors & parking",
      items: [
        { name: "Covered front porch", status: "photographed" },
        { name: "Parking options", status: "listed" },
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
          { id: "living", label: "Living room", kind: "living", x: 0, y: 0, w: 16, h: 13 },
          { id: "kitchen", label: "Kitchen", kind: "kitchen", x: 16, y: 0, w: 9, h: 9 },
          { id: "hall", label: "Hall", kind: "hall", x: 16, y: 9, w: 9, h: 4 },
          { id: "bed", label: "Bedroom", kind: "bedroom", x: 0, y: 13, w: 13, h: 12 },
          { id: "bath", label: "Bathroom", kind: "bath", x: 13, y: 13, w: 7, h: 8 },
          { id: "desk", label: "Desk room", kind: "office", x: 20, y: 13, w: 11, h: 12 },
        ],
      },
    ],
    note: "Illustrative concept only, not a measured plan. It uses the rooms shown in the photos; sizes, arrangement and number of floors are guesses until confirmed. Only the bedroom door opening into the bathroom is taken from a photo. Whether the desk room is part of the stay is still to confirm.",
  },
  concepts: [],
  nearby: parkersburgNearby,
  directionsFrom: parkersburgDirectionsFrom,
};
