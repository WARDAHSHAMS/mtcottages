import type { HomeMicrosite, HomePhoto } from "./types";
import { publishedLuxuryFurnishedRates } from "../site";
import frontDrive from "../../../assets/images/cottages/marietta-01/frederick-ext-1.jpeg";
import frontSnow from "../../../assets/images/cottages/marietta-01/frederick-ext-3.jpeg";
import backyard from "../../../assets/images/cottages/marietta-01/frederick-backyard-cover.jpg";
import woods from "../../../assets/images/cottages/marietta-01/frederick-wildlife-1.avif";
import leaves from "../../../assets/images/cottages/marietta-01/frederick-wildlife-2.avif";
import kitchenMain from "../../../assets/images/cottages/marietta-01/gallery-01.jpg";
import kitchenFull from "../../../assets/images/cottages/marietta-01/frederick-kitchen-1.avif";
import kitchenSink from "../../../assets/images/cottages/marietta-01/frederick-kitchen-2.avif";
import kitchenRange from "../../../assets/images/cottages/marietta-01/frederick-kitchen-3.avif";
import diningLong from "../../../assets/images/cottages/marietta-01/frederick-living-1.jpeg";
import diningNook from "../../../assets/images/cottages/marietta-01/frederick-dining-1.avif";
import diningSet from "../../../assets/images/cottages/marietta-01/frederick-dining-2.avif";
import diningEntry from "../../../assets/images/cottages/marietta-01/frederick-dining-3.avif";
import diningStairs from "../../../assets/images/cottages/marietta-01/photo-27.jpg";
import bed1 from "../../../assets/images/cottages/marietta-01/frederick-bed1-1.avif";
import bed1Alt from "../../../assets/images/cottages/marietta-01/photo-36.jpg";
import bed2 from "../../../assets/images/cottages/marietta-01/frederick-bed2-1.jpeg";
import bed2Alt from "../../../assets/images/cottages/marietta-01/photo-25.jpg";
import bed3 from "../../../assets/images/cottages/marietta-01/frederick-bed3-1.jpeg";
import bed3Wide from "../../../assets/images/cottages/marietta-01/frederick-bed3-2.jpeg";
import bed3Tv from "../../../assets/images/cottages/marietta-01/frederick-bed3-3.avif";
import bath from "../../../assets/images/cottages/marietta-01/frederick-bath-1.jpg";
import bathVanity from "../../../assets/images/cottages/marietta-01/frederick-bath-2.jpg";
import conceptBed1 from "../../../assets/images/cottages/marietta-01/frederick-bed1-dollhouse.png";
import conceptBed2a from "../../../assets/images/cottages/marietta-01/frederick-bed2-photo1.jpeg";
import conceptBed2b from "../../../assets/images/cottages/marietta-01/frederick-bed2-photo2.jpeg";
import conceptBed3 from "../../../assets/images/cottages/marietta-01/frederick-bed3-photo1.jpeg";

/*
 * Photo review notes (Nov 2026, for Wardah):
 * - frederick-ext-2.jpeg is left out: a painted number on a porch column may be legible.
 * - The 14 nearby business and park images used by the old area page have no recorded
 *   source or usage rights, so nearby stays text and map links like every other home.
 */
const photos = {
  front: {
    src: frontDrive,
    alt: "Front of Frederick Cottage from the street: a two-storey house with green shutters, a driveway and lawn, shade trees, and an outbuilding with French doors",
    caption: "The front of the house, with the driveway and lawn.",
    focal: "center 45%",
  },
  frontSnow: {
    src: frontSnow,
    alt: "Front of Frederick Cottage in winter, with snow on the lawn and roof and a covered front porch",
    caption: "The same front in winter.",
  },
  backyard: {
    src: backyard,
    alt: "Backyard of Frederick Cottage in fall: a lawn under a maple with orange leaves, wicker patio chairs, a chiminea, tiki torches and a white picket fence",
    caption: "The backyard lawn, patio chairs and picket fence in fall.",
  },
  woods: {
    src: woods,
    alt: "Dense trees with early fall color near Frederick Cottage",
    caption: "Tree canopy near the house in early fall.",
  },
  leaves: {
    src: leaves,
    alt: "Fall leaves covering the ground under large maples near Frederick Cottage",
    caption: "Fall leaves under the maples.",
  },
  kitchen: {
    src: kitchenMain,
    alt: "Kitchen with oak cabinets, a white gas range under a range hood, a dishwasher, windows over the counter, and a coffee maker, blender and toaster oven on the counters",
    caption: "Oak cabinets, a gas range, a dishwasher and windows over the counter.",
  },
  kitchenFull: {
    src: kitchenFull,
    alt: "Full view of the kitchen with a gas range, dishwasher, sink and oak cabinets under windows",
    caption: "The full kitchen, from range to sink.",
  },
  kitchenSink: {
    src: kitchenSink,
    alt: "Kitchen sink wall with oak cabinets, a glass-paneled door and the gas range",
    caption: "The sink wall and the glass-paneled door.",
  },
  kitchenRange: {
    src: kitchenRange,
    alt: "Gas range with a counter run beside it and a full-size refrigerator",
    caption: "Range, counter space and the full-size refrigerator.",
  },
  diningLong: {
    src: diningLong,
    alt: "Dining room with blue walls, a long wooden table with placemats, a staircase, and the front door with a fan window above it",
    caption: "The long dining table by the stairs and front door.",
  },
  diningNook: {
    src: diningNook,
    alt: "Dining nook with a wooden table, spindle chairs, a window and a lamp",
    caption: "A dining nook with window light.",
  },
  diningSet: {
    src: diningSet,
    alt: "Dining table set for a meal, with bench seating, a ceiling fan and a window",
    caption: "The table set for a shared meal.",
  },
  diningEntry: {
    src: diningEntry,
    alt: "Dining area opening to the staircase, the entry and a glimpse of the kitchen",
    caption: "Dining opens to the stairs, entry and kitchen.",
  },
  diningStairs: {
    src: diningStairs,
    alt: "Dining and entry area with the wooden table, a bench, a ceiling fan and the staircase",
    caption: "Dining and entry from the other side.",
  },
  bed1: {
    src: bed1,
    alt: "Bedroom 1 with blue walls, a king bed, a ceiling fan, windows with red curtains, and a large TV on a rolling wooden console",
    caption: "Bedroom 1: king bed, TV and three windows.",
  },
  bed1Alt: {
    src: bed1Alt,
    alt: "Another view of Bedroom 1 showing the king bed, a wicker chair, a floating shelf and windows with red curtains",
    caption: "Bedroom 1 from another corner.",
  },
  bed2: {
    src: bed2,
    alt: "Bedroom 2 with green walls, a double bed, a wall-mounted TV, a mirror, a window air-conditioning unit and a hardwood floor",
    caption: "Bedroom 2: double bed, wall-mounted TV and window AC.",
  },
  bed2Alt: {
    src: bed2Alt,
    alt: "Bedroom 2 from another angle, showing the double bed, an antique vanity with a mirror, open shelving and a ceiling fan",
    caption: "Bedroom 2 with its antique vanity.",
  },
  bed3: {
    src: bed3,
    alt: "Bedroom 3 with a queen bed, lamps on both side tables, orange walls and a textured stone-look accent wall",
    caption: "Bedroom 3: queen bed and bedside lamps.",
  },
  bed3Wide: {
    src: bed3Wide,
    alt: "Bedroom 3 from the foot of the bed, showing shelving units with hanging rods, a desk and chair, a ceiling fan, blinds and carpet",
    caption: "Bedroom 3's storage wall and desk corner.",
  },
  bed3Tv: {
    src: bed3Tv,
    alt: "Bedroom 3 with the queen bed, a television and a glass-paneled door",
    caption: "Bedroom 3's TV and glass-paneled door.",
  },
  bath: {
    src: bath,
    alt: "Bathroom with a shower curtain, a toilet, a wall cabinet with an open shelf, a window, beadboard and a tile floor",
    caption: "The bathroom, with storage over the toilet and a window.",
  },
  bathVanity: {
    src: bathVanity,
    alt: "Bathroom vanity with a sink, a mirrored medicine cabinet and a light bar",
    caption: "The vanity, mirrored cabinet and light bar.",
  },
} satisfies Record<string, HomePhoto>;

export const frederickHome: HomeMicrosite = {
  id: "frederick",
  slug: "frederick",
  legacyPages: {
    rooms: "tour.html#bedrooms",
    kitchen: "tour.html#kitchen",
    bathrooms: "tour.html#bathroom",
    living: "tour.html#living",
    outdoors: "tour.html#outdoors",
    gallery: "tour.html",
    area: "location.html#nearby",
    arrival: "location.html",
    utilities: "guide.html#utilities",
    handbook: "guide.html#handbook",
  },
  name: "Frederick Cottage",
  town: { name: "Marietta", state: "OH", slug: "marietta" },
  tagline: "A three-bedroom furnished home in Marietta with a full kitchen, a long dining table and a fenced backyard.",
  summary:
    "Frederick Cottage is a furnished three-bedroom home on a residential street in Marietta. The photos show a king, a double and a queen bedroom, an oak-cabinet kitchen with a gas range and dishwasher, a long dining table by the stairs, one bathroom, and a backyard with a picket fence. Stays start at 30 days. Details that are not yet confirmed are marked on each page.",
  address: {
    kind: "street",
    streetAddress: "125 Frederick St",
    locality: "Marietta",
    region: "OH",
    postalCode: "45750",
    lat: 39.4158196,
    lng: -81.4233393,
  },
  bedrooms: 3,
  bathrooms: 1,
  sleeps: 6,
  priceGuide: publishedLuxuryFurnishedRates["3 Bedrooms"],
  hero: photos.front,
  highlights: [
    {
      title: "Three bedrooms, three bed sizes",
      body: "A king, a double and a queen, each in its own room with a TV, so six people can share the house without sharing a room.",
      photo: photos.bed1,
    },
    {
      title: "A kitchen for real meals",
      body: "Oak cabinets, a gas range, a dishwasher and a full-size refrigerator, with a long dining table a few steps away.",
      photo: photos.kitchen,
    },
    {
      title: "A fenced backyard",
      body: "Lawn under the maples, wicker patio chairs and a picket fence.",
      photo: photos.backyard,
    },
  ],
  facts: [
    { label: "Address", value: "125 Frederick St, Marietta, OH 45750", status: "confirmed" },
    { label: "Bedrooms", value: "3 (king, double, queen)", status: "listed" },
    { label: "Sleeps", value: "6", status: "listed" },
    { label: "Bathrooms", value: "1 full bath", status: "listed" },
    { label: "Furnishing", value: "Furnished", status: "listed" },
    { label: "Minimum stay", value: "30 days", status: "listed" },
    { label: "Internet", value: "1 Gbps ethernet and wifi", status: "listed" },
    { label: "Laundry", value: "Washer and dryer", status: "listed" },
    { label: "Outdoor space", value: "Fenced backyard with patio seating", status: "photographed" },
    { label: "Parking", value: "Driveway in the photos; spaces and street rules to confirm", status: "confirm" },
    { label: "Utilities", value: "Included per the rental arrangement; confirm what is covered", status: "confirm" },
    { label: "Pets", value: "Pet policy", status: "confirm" },
    { label: "Square footage", value: "Size of the home", status: "confirm" },
  ],
  rooms: [
    {
      slug: "kitchen",
      name: "Kitchen",
      summary: "A full kitchen with oak cabinets, a gas range, a dishwasher and windows over the counter.",
      photos: [photos.kitchen, photos.kitchenFull, photos.kitchenSink, photos.kitchenRange],
      notes: [
        { text: "Full kitchen, not a kitchenette.", status: "listed" },
        { text: "Gas range with a range hood, dishwasher and full-size refrigerator.", status: "photographed" },
        { text: "Upper and lower oak cabinets and a glass-paneled door.", status: "photographed" },
        { text: "Coffee maker, blender and toaster oven on the counters.", status: "photographed" },
        { text: "Cooking basics, dishes and silverware.", status: "listed" },
      ],
      faqs: [
        { q: "Is this a full kitchen or a kitchenette?", a: "A full kitchen: a full-size refrigerator, a gas range and oven, a sink, a dishwasher, cabinets and counters, set up for everyday meals across a stay of 30 days or more.", status: "listed" },
        { q: "What is in the kitchen for daily cooking?", a: "A full-size refrigerator, a gas range, a dishwasher, oak cabinets and counters. The listing also includes cooking basics, dishes, silverware, a coffee maker and a baking sheet.", status: "listed" },
        { q: "Is the fridge big enough for a weekly shop?", a: "The photos show a full-size refrigerator with counter space beside it for unpacking and prep. The listing also mentions a freezer and a mini fridge.", status: "photographed" },
        { q: "Where do dishes happen?", a: "At the sink under the window, with the dishwasher beside it.", status: "photographed" },
        { q: "Where do pantry goods and pots go?", a: "In the upper and lower oak cabinets. Ask us which cupboards are free for your groceries.", status: "photographed" },
        { q: "Is there room to prep and serve?", a: "Yes. There is a counter run beside the range for prep and serving.", status: "photographed" },
        { q: "Can six eat together?", a: "The long dining table next to the kitchen is the place for shared meals. Confirm the number of seats when you ask.", status: "confirm" },
        { q: "How is the light?", a: "Windows over the counter bring daylight in while you cook.", status: "photographed" },
      ],
    },
    {
      slug: "living",
      name: "Dining and entry",
      summary: "A long wooden table by the stairs and front door, plus a smaller dining nook.",
      photos: [photos.diningLong, photos.diningSet, photos.diningEntry, photos.diningStairs, photos.diningNook],
      notes: [
        { text: "Long wooden table with placemats and bench seating.", status: "photographed" },
        { text: "Blue walls, a ceiling fan and the front door with a fan window above it.", status: "photographed" },
        { text: "The staircase rises from this room.", status: "photographed" },
        { text: "Whether there is a separate sitting room with sofas.", status: "confirm" },
      ],
    },
    {
      slug: "bedrooms",
      name: "Bedrooms",
      summary: "Three bedrooms: a king, a double and a queen, each with a TV.",
      photos: [photos.bed1, photos.bed1Alt, photos.bed2, photos.bed2Alt, photos.bed3, photos.bed3Wide, photos.bed3Tv],
      notes: [
        { text: "Bedroom 1: king bed, blue walls, ceiling fan, three windows and a large TV on a rolling console.", status: "photographed" },
        { text: "Bedroom 2: double bed, green walls, wall-mounted TV, window air-conditioning unit and an antique vanity with a mirror.", status: "photographed" },
        { text: "Bedroom 3: queen bed with bedside lamps, shelving units with hanging rods, a desk and chair, and a TV.", status: "photographed" },
        { text: "Bed linens, extra pillows and blankets, hangers and room-darkening shades.", status: "listed" },
        { text: "Which floor each bedroom is on.", status: "confirm" },
      ],
      faqs: [
        { q: "What bed is in each bedroom?", a: "Bedroom 1 has a king bed, Bedroom 2 a double and Bedroom 3 a queen.", status: "listed" },
        { q: "Does each bedroom have a TV?", a: "Yes. A large TV on a rolling console in Bedroom 1, a wall-mounted TV in Bedroom 2 and a TV in Bedroom 3.", status: "photographed" },
        { q: "Which bedroom is best for desk work?", a: "Bedroom 3 has a desk and chair. The listing also includes a dedicated workspace, and 1 Gbps ethernet is listed for the house.", status: "photographed" },
        { q: "Can three adults each have a private room?", a: "Yes. The home has three separate bedrooms and sleeps six.", status: "listed" },
        { q: "Is there storage for clothes and luggage?", a: "Bedroom 3 has shelving units with hanging rods, Bedroom 1 has a floating shelf and room around the bed, and the listing includes clothing storage and hangers.", status: "photographed" },
        { q: "What about windows and airflow?", a: "Bedroom 1 has three windows and a ceiling fan, Bedroom 2 has a window air-conditioning unit, and Bedroom 3 has a ceiling fan and blinds.", status: "photographed" },
      ],
    },
    {
      slug: "bathroom",
      name: "Bathroom",
      summary: "One full bathroom with a shower curtain, a vanity with a mirrored cabinet, and a window.",
      photos: [photos.bath, photos.bathVanity],
      notes: [
        { text: "One full bath serves the house.", status: "listed" },
        { text: "Wall cabinet with an open shelf, beadboard, a tile floor and a window.", status: "photographed" },
        { text: "Vanity with a mirrored medicine cabinet and a light bar.", status: "photographed" },
        { text: "Whether there is a bathtub behind the shower curtain (the listing names a bathtub).", status: "confirm" },
      ],
      faqs: [
        { q: "Are these photos of this bathroom?", a: "Yes. Both photos are of the bathroom at Frederick Cottage.", status: "photographed" },
        { q: "How many bathrooms serve the house?", a: "One full bath for all three bedrooms. With six people, staggered mornings help.", status: "listed" },
        { q: "Is it a shower or a tub?", a: "The photo shows a shower curtain, and the listing names a bathtub. Ask us to confirm before you rely on either.", status: "confirm" },
        { q: "Where do toiletries and towels go?", a: "In the wall cabinet and open shelf, the mirrored medicine cabinet and the vanity. Towels, soap and toilet paper are part of the listed essentials.", status: "photographed" },
        { q: "What is provided in the bathroom?", a: "The listing includes towels, soap, toilet paper, shampoo, conditioner, a hair dryer and hot water.", status: "listed" },
        { q: "How do busy mornings work for six?", a: "A simple order works best: agree shower times first, then sink time. One bath runs well with a little spacing.", status: "listed" },
        { q: "How is the light and air?", a: "A window brings in daylight and fresh air, and a light bar sits over the vanity mirror.", status: "photographed" },
        { q: "What if something drips or clogs?", a: "Send the home, the room, the problem, the timing and a helpful photo through the maintenance path. For fire, major flooding or immediate danger, call 911 first, then resident support.", status: "confirmed" },
      ],
    },
    {
      slug: "outdoors",
      name: "Outdoors",
      summary: "A front lawn and driveway, and a backyard with a picket fence, patio chairs and big maples.",
      photos: [photos.backyard, photos.frontSnow, photos.woods, photos.leaves],
      notes: [
        { text: "Backyard lawn with wicker patio chairs, a chiminea, tiki torches and a white picket fence.", status: "photographed" },
        { text: "Driveway and an outbuilding with French doors at the front.", status: "photographed" },
        { text: "Covered front porch.", status: "photographed" },
        { text: "Use of the outbuilding, grill and yard furniture.", status: "confirm" },
      ],
    },
  ],
  amenities: [
    { group: "Views", items: [{ name: "Garden view", status: "listed" }, { name: "Scenic views", status: "listed" }] },
    {
      group: "Bathroom",
      items: [
        { name: "Bathtub", status: "confirm" },
        { name: "Hair dryer", status: "listed" },
        { name: "Cleaning products", status: "listed" },
        { name: "Shampoo and conditioner", status: "listed" },
        { name: "Hot water", status: "listed" },
      ],
    },
    {
      group: "Bedroom and laundry",
      items: [
        { name: "Washer", status: "listed" },
        { name: "Dryer", status: "listed" },
        { name: "Essentials: towels, bed sheets, soap and toilet paper", status: "listed" },
        { name: "Hangers", status: "listed" },
        { name: "Bed linens", status: "listed" },
        { name: "Extra pillows and blankets", status: "listed" },
        { name: "Room-darkening shades", status: "listed" },
        { name: "Iron", status: "listed" },
        { name: "Drying rack for clothing", status: "listed" },
        { name: "Clothing storage", status: "listed" },
      ],
    },
    {
      group: "Entertainment",
      items: [
        { name: "TV in each bedroom", status: "photographed" },
        { name: "Ethernet connection", status: "listed" },
        { name: "Sound system", status: "listed" },
        { name: "Books and reading material", status: "listed" },
      ],
    },
    {
      group: "Heating and cooling",
      items: [
        { name: "Air conditioning", status: "listed" },
        { name: "Window AC unit in Bedroom 2", status: "photographed" },
        { name: "Ceiling fans", status: "photographed" },
        { name: "Heating", status: "listed" },
      ],
    },
    {
      group: "Home safety",
      items: [
        { name: "Security cameras outdoors and in common areas", status: "listed" },
        { name: "Smart lock and Google Home devices", status: "listed" },
        { name: "Smoke alarm", status: "listed" },
        { name: "Carbon monoxide alarm", status: "listed" },
        { name: "Fire extinguisher", status: "listed" },
        { name: "First aid kit", status: "listed" },
      ],
    },
    {
      group: "Internet and office",
      items: [
        { name: "1 Gbps ethernet", status: "listed" },
        { name: "Wifi", status: "listed" },
        { name: "Dedicated workspace", status: "listed" },
      ],
    },
    {
      group: "Kitchen and dining",
      items: [
        { name: "Full kitchen", status: "listed" },
        { name: "Gas range and oven", status: "photographed" },
        { name: "Refrigerator and freezer", status: "listed" },
        { name: "Mini fridge", status: "listed" },
        { name: "Dishwasher", status: "photographed" },
        { name: "Cooking basics: pots and pans, oil, salt and pepper", status: "listed" },
        { name: "Dishes and silverware", status: "listed" },
        { name: "Coffee maker", status: "photographed" },
        { name: "Baking sheet", status: "listed" },
        { name: "Dining table", status: "photographed" },
      ],
    },
    {
      group: "Location features",
      items: [
        { name: "Private entrance", status: "listed" },
        { name: "Laundromat nearby", status: "listed" },
      ],
    },
    {
      group: "Outdoor",
      items: [
        { name: "Backyard with lawn", status: "listed" },
        { name: "Picket fence and patio chairs", status: "photographed" },
      ],
    },
    {
      group: "Parking",
      items: [
        { name: "Free parking on premises", status: "listed" },
        { name: "Free street parking", status: "listed" },
      ],
    },
    {
      group: "Services",
      items: [
        { name: "Self check-in with a keypad", status: "listed" },
        { name: "Cleaning available during the stay", status: "listed" },
        { name: "Luggage drop-off for early arrival or late departure", status: "listed" },
        { name: "30-day minimum stay", status: "listed" },
      ],
    },
  ],
  plan: {
    note: "Illustrative concept only, not a measured plan. The staircase in the dining photos shows a second level; which floor each bedroom and the bathroom are on is an assumption to be confirmed.",
    floors: [
      {
        name: "Main level (concept)",
        rooms: [
          { id: "dining", label: "Dining & entry", kind: "dining", x: 0, y: 0, w: 18, h: 14 },
          { id: "stairs-main", label: "Stairs", kind: "stairs", x: 18, y: 0, w: 4, h: 14 },
          { id: "kitchen", label: "Kitchen", kind: "kitchen", x: 22, y: 0, w: 14, h: 14 },
          { id: "nook", label: "Dining nook", kind: "dining", x: 0, y: 14, w: 12, h: 10 },
          { id: "bed3", label: "Bedroom 3", kind: "bedroom", x: 12, y: 14, w: 14, h: 12 },
          { id: "laundry", label: "Laundry", kind: "laundry", x: 26, y: 14, w: 10, h: 8 },
        ],
      },
      {
        name: "Upper level (concept)",
        rooms: [
          { id: "bed1", label: "Bedroom 1", kind: "bedroom", x: 0, y: 0, w: 18, h: 14 },
          { id: "stairs-up", label: "Stairs", kind: "stairs", x: 18, y: 0, w: 4, h: 14 },
          { id: "bed2", label: "Bedroom 2", kind: "bedroom", x: 22, y: 0, w: 14, h: 14 },
          { id: "bath", label: "Bath", kind: "bath", x: 0, y: 14, w: 10, h: 8 },
          { id: "hall", label: "Hall", kind: "hall", x: 10, y: 14, w: 12, h: 4 },
        ],
      },
    ],
  },
  concepts: [
    {
      src: conceptBed1,
      alt: "AI-generated concept: a cutaway view from above of a blue bedroom with a king bed in dark gray bedding, a teal armchair, two closets with louvered doors, a large TV on a wooden console, a wicker nightstand and carpet",
      caption: "Concept only. An imagined layout of Bedroom 1, based on the photos. The closets, armchair and room shape are invented.",
    },
    {
      src: conceptBed2a,
      alt: "AI-generated concept: a cutaway view from above of a green bedroom with a double bed in pale floral bedding, a ceiling fan, a window air-conditioning unit, a wall-mounted TV and a hardwood floor",
      caption: "Concept only. An imagined take on Bedroom 2, based on the photos. Furniture placement is not confirmed.",
    },
    {
      src: conceptBed2b,
      alt: "AI-generated concept: a top-down view of a green bedroom with a wooden double bed, a nightstand with a lamp, a dresser with a mirror, a tall shelf, two curtained windows and a hardwood floor",
      caption: "Concept only. A second imagined layout of Bedroom 2. The second window and shelving are invented.",
    },
    {
      src: conceptBed3,
      alt: "AI-generated concept: a cutaway view from above of an orange bedroom with a queen bed in brown bedding, lamps on two side tables, a TV on a dresser, a desk and chair by a window, a glass-paneled door and carpet",
      caption: "Concept only. An imagined layout of Bedroom 3, based on the photos. The room shape and furniture placement are not confirmed.",
    },
  ],
  nearby: [
    { name: "Marietta Memorial Hospital", kind: "health", note: "Marietta's main hospital with an emergency department. In an emergency, call 911 first.", mapsQuery: "Marietta Memorial Hospital Marietta OH" },
    { name: "Selby General Hospital", kind: "health", note: "A second hospital with an emergency department in Marietta.", mapsQuery: "Selby General Hospital Marietta OH" },
    { name: "Kroger", kind: "grocery", note: "Groceries and a pharmacy on Acme Street, next to the Kroger Wetlands.", mapsQuery: "Kroger Acme St Marietta OH" },
    { name: "Walmart Supercenter", kind: "grocery", note: "Groceries, a pharmacy and household goods on Pike Street.", mapsQuery: "Walmart Supercenter Pike St Marietta OH" },
    { name: "ALDI", kind: "grocery", note: "A grocery store on the Pike Street corridor.", mapsQuery: "ALDI Pike St Marietta OH" },
    { name: "Lafayette Plaza", kind: "shopping", note: "A Pike Street shopping plaza across from Kroger.", mapsQuery: "Lafayette Plaza Pike St Marietta OH" },
    { name: "Grand Central Mall", kind: "shopping", note: "The region's large enclosed mall, across the river in Vienna, WV.", mapsQuery: "Grand Central Mall Vienna WV" },
    { name: "The Gunroom", kind: "food", note: "American dining with a river view in the Lafayette Hotel.", mapsQuery: "The Gunroom Lafayette Hotel Marietta OH" },
    { name: "Levee House Bistro", kind: "food", note: "A bistro in a historic brick building by the river.", mapsQuery: "Levee House Bistro Marietta OH" },
    { name: "Austyn's", kind: "food", note: "A local restaurant on Front Street.", mapsQuery: "Austyn's Restaurant Front St Marietta OH" },
    { name: "Boathouse BBQ", kind: "food", note: "Barbecue near the water downtown.", mapsQuery: "Boathouse BBQ Marietta OH" },
    { name: "Over the Moon Pub & Pizza", kind: "food", note: "A casual pizza pub downtown.", mapsQuery: "Over the Moon Pub Pizza Marietta OH" },
    { name: "Tampico", kind: "food", note: "Mexican food on Second Street.", mapsQuery: "Tampico Mexican Restaurant Marietta OH" },
    { name: "The Galley", kind: "food", note: "American food on Second Street.", mapsQuery: "The Galley Marietta OH" },
    { name: "Jeremiah's Coffee House", kind: "food", note: "Coffee downtown.", mapsQuery: "Jeremiah's Coffee House Marietta OH" },
    { name: "Busy Bee", kind: "food", note: "A long-running breakfast spot.", mapsQuery: "Busy Bee Restaurant Marietta OH" },
    { name: "Harmar Tavern", kind: "food", note: "A historic tavern across the Muskingum in Harmar Village.", mapsQuery: "Harmar Tavern Marietta OH" },
    { name: "Spagna's", kind: "food", note: "Italian dinners.", mapsQuery: "Spagna's Restaurant Marietta OH" },
    { name: "Buckeye Park", kind: "park", note: "A city park with a fishing pond, ball fields, a playground and a picnic shelter. Ask us how close it is to the house.", mapsQuery: "Buckeye Park Marietta OH" },
    { name: "Muskingum Park", kind: "park", note: "A riverfront park downtown.", mapsQuery: "Muskingum Park Marietta OH" },
    { name: "East Muskingum Park", kind: "park", note: "A park with a pavilion, a gazebo and river views.", mapsQuery: "East Muskingum Park Marietta OH" },
    { name: "Gold Star Park", kind: "park", note: "Disc golf and tennis and pickleball courts.", mapsQuery: "Gold Star Park Marietta OH" },
    { name: "Indian Acres Park", kind: "park", note: "A park with a public boat ramp, a skate park and a pool.", mapsQuery: "Indian Acres Park Marietta OH" },
    { name: "Ohio River Levee", kind: "park", note: "Levee walks and the riverfront festival grounds.", mapsQuery: "Ohio River Levee Marietta OH" },
    { name: "Kroger Wetlands", kind: "trail", note: "A wetland preserve with a short, easy loop trail and a bird-watching kiosk behind Kroger.", mapsQuery: "Kroger Wetlands Marietta OH" },
    { name: "Marietta River Trail", kind: "trail", note: "A paved, flat riverfront path for walking and cycling.", mapsQuery: "Marietta River Trail Marietta OH" },
    { name: "Kiwanis Loop", kind: "trail", note: "An easy paved loop at Indian Acres Park.", mapsQuery: "Kiwanis Trail Indian Acres Park Marietta OH" },
    { name: "Marietta Trail Network", kind: "trail", note: "Wooded hiking and biking trails near the high school.", mapsQuery: "Marietta Trail Network Marietta OH" },
    { name: "Broughton Nature Area", kind: "trail", note: "Quiet wooded trails off State Route 821.", mapsQuery: "Broughton Nature Wildlife Area Marietta OH" },
    { name: "Wayne National Forest, Marietta Unit", kind: "trail", note: "National forest trails for a day trip.", mapsQuery: "Wayne National Forest Marietta Unit" },
    { name: "Marietta City Schools", kind: "school", note: "The public school district's offices on Academy Drive.", mapsQuery: "Marietta City Schools Academy Dr Marietta OH" },
    { name: "Marietta High School", kind: "school", note: "Public high school for grades 7 to 12.", mapsQuery: "Marietta High School Marietta OH" },
    { name: "Marietta Elementary", kind: "school", note: "Public elementary school for grades 3 to 6.", mapsQuery: "Marietta Elementary School Marietta OH" },
    { name: "Phillips Elementary", kind: "school", note: "Public elementary school for kindergarten to grade 2.", mapsQuery: "Phillips Elementary School Marietta OH" },
    { name: "Washington Elementary", kind: "school", note: "Public elementary school for kindergarten to grade 2.", mapsQuery: "Washington Elementary School Marietta OH" },
    { name: "Marietta College", kind: "school", note: "A private liberal arts college near downtown.", mapsQuery: "Marietta College Marietta OH" },
    { name: "CABL On-Demand", kind: "transit", note: "Community transit with on-demand rides inside Marietta. Check its current hours and fares.", mapsQuery: "Community Action Bus Lines Marietta OH" },
    { name: "Washington County Public Library", kind: "civic", note: "The main library downtown, with free wifi and computers.", mapsQuery: "Washington County Public Library Marietta OH" },
    { name: "Ohio River Sternwheel Festival", kind: "event", note: "A riverfront festival with sternwheel boats each September.", mapsQuery: "Ohio River Sternwheel Festival Marietta OH" },
    { name: "First Friday", kind: "event", note: "Monthly downtown evening with shops, music and art.", mapsQuery: "Downtown Marietta OH" },
  ],
  directionsFrom: [
    { label: "I-77 Marietta exit", origin: "I-77 Exit 1 Marietta OH" },
    { label: "Marietta Memorial Hospital", origin: "Marietta Memorial Hospital Marietta OH" },
    { label: "Downtown Parkersburg", origin: "Downtown Parkersburg WV" },
  ],
  guide: [
    {
      id: "arrival",
      title: "Arrival",
      intro: "Arrival is arranged for each stay. Share your timing early so we can plan the keys and a walkthrough.",
      items: [
        { text: "Self check-in with a keypad door code.", status: "listed" },
        { text: "Parking: free parking on the premises and on the street. Confirm your space, street rules and winter notes in the pre-arrival message.", status: "confirm" },
        { text: "Arrival time: windows are set per stay. Share your travel timing in your inquiry.", status: "confirm" },
        { text: "Early arrival or late departure depends on the turnover between stays. Luggage drop-off is allowed.", status: "listed" },
      ],
    },
    {
      id: "utilities",
      title: "Utilities",
      intro: "Core utilities are included under the rental arrangement. Provider names, the thermostat and what is covered are confirmed for each stay.",
      items: [
        { text: "Heating, cooling, power and water are included per the arrangement; confirm the current details in your inquiry.", status: "confirm" },
        { text: "Internet: 1 Gbps ethernet and wifi. Tell us early if your work depends on a wired connection.", status: "listed" },
        { text: "Laundry: a washer and dryer. Confirm where they are and what supplies are provided.", status: "listed" },
        { text: "Trash and recycling: ask for the pickup day, cart location and recycling rules in the pre-arrival message.", status: "confirm" },
      ],
    },
    {
      id: "handbook",
      title: "House handbook",
      intro: "Treat the house as a home on a residential street: a tidy entry and lawn, considerate noise, and care for the furnishings.",
      items: [
        { text: "Kitchen: clean as you go; confirm consumables, the dishwasher and where trash goes.", status: "confirm" },
        { text: "Laundry: confirm machine use, supplies and lint care on arrival.", status: "confirm" },
        { text: "Outdoors: keep the entry clear; confirm grill, furniture and yard expectations.", status: "confirm" },
        { text: "Smoking, guests and pets follow the written arrangement. Ask before assuming.", status: "confirm" },
        { text: "Stay length: 30 days minimum. Shorter stays are priced on inquiry.", status: "listed" },
      ],
      links: [
        { label: "Privacy", href: "/privacy.html" },
        { label: "Common questions", href: "/faq.html" },
      ],
    },
    {
      id: "policies",
      title: "Policies and payments",
      intro: "An inquiry is a conversation, not a lease or an approval. Screening, the agreement and payments are separate steps with their own documents.",
      items: [
        { text: "Pay only through the instructions tied to your agreement. Never email card or bank details.", status: "confirmed" },
        { text: "Do not send Social Security numbers or sensitive documents through the public form.", status: "confirmed" },
        { text: "Occupants, pets and accessibility needs are agreed in advance.", status: "confirmed" },
      ],
      links: [
        { label: "Resident portal", href: "/resident-portal.html" },
        { label: "Pay rent", href: "/pay-rent.html" },
        { label: "Resident resources", href: "/residents.html" },
      ],
    },
    {
      id: "maintenance",
      title: "Maintenance and emergencies",
      intro: "For anything urgent and dangerous, call 911 first.",
      items: [
        { text: "Non-emergency: send the home, the room, the problem, the timing and a helpful photo through the maintenance path.", status: "confirmed" },
        { text: "Emergency (fire, a gas smell, major flooding or immediate danger): call 911 first, then resident support.", status: "confirmed" },
      ],
      links: [
        { label: "Maintenance request", href: "/maintenance.html" },
        { label: "Emergency guidance", href: "/emergency-maintenance.html" },
      ],
    },
  ],
};
