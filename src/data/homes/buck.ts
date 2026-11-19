import type { HomeMicrosite } from "./types";
import { residentGuide } from "./guide";
import { parkersburgArea, parkersburgDirectionsFrom, parkersburgNearby } from "./towns";
import p49 from "../../../assets/images/cottages/parkersburg-02/photo-49.avif";
import p50 from "../../../assets/images/cottages/parkersburg-02/photo-50.avif";
import p38 from "../../../assets/images/cottages/parkersburg-02/photo-38.avif";
import kitchen from "../../../assets/images/cottages/parkersburg-02/buck-kitchen.jpg";
import bed from "../../../assets/images/cottages/parkersburg-02/buck-bedroom.jpg";
import bedAlt from "../../../assets/images/cottages/parkersburg-02/buck-bedroom-alt.jpg";
import bath from "../../../assets/images/cottages/parkersburg-02/buck-bathroom.jpg";
import bathTub from "../../../assets/images/cottages/parkersburg-02/buck-bathroom-tub.jpg";
import bedWide from "../../../assets/images/cottages/parkersburg-02/buck-bedroom-wide.jpg";
import exterior from "../../../assets/images/cottages/parkersburg-02/buck-exterior.jpg";
import exteriorIcicles from "../../../assets/images/cottages/parkersburg-02/buck-exterior-icicles.jpg";
import exteriorPorchSnow from "../../../assets/images/cottages/parkersburg-02/buck-exterior-porch-snow.jpg";
import exteriorViewAutumn from "../../../assets/images/cottages/parkersburg-02/buck-exterior-view-autumn.jpg";
import wsDesk from "../../../assets/images/cottages/parkersburg-02/buck-workspace-desk.jpg";
import wsRoom from "../../../assets/images/cottages/parkersburg-02/buck-workspace.jpg";
import wsWide from "../../../assets/images/cottages/parkersburg-02/buck-workspace-wide.jpg";
import laundry from "../../../assets/images/cottages/parkersburg-02/buck-laundry.jpg";
import laundryWide from "../../../assets/images/cottages/parkersburg-02/buck-laundry-wide.jpg";
import porch from "../../../assets/images/cottages/parkersburg-02/photo-45.jpg";

// Excluded from the public set: photo-09 (street panorama) and photo-23 (front
// of house with a visible house number). Buck's street address is not approved.
// The owner approved publishing Buck's front exterior as buck-exterior.jpg: a
// summer frame with no house number or mailbox number visible. The seasonal
// porch views (autumn street view, snow, icicles) came from the owner's listing
// set at the same time; none show a house number, mailbox number, or plate.
const ph = (src: HomeMicrosite["hero"]["src"], alt: string, caption: string, focal?: string) => ({ src, alt, caption, ...(focal ? { focal } : {}) });

const photos = {
  exterior: ph(exterior, "Front of the home, with tan siding, black shutters, a brown shingle roof, a gabled entry porch with wood railings and steps, and a lawn sloping up to the house", "The front of the home, with the gabled entry porch.", "50% 40%"),
  exteriorViewAutumn: ph(exteriorViewAutumn, "Autumn view from the front porch, looking down through a red maple across the street to neighbouring one-storey houses, driveways, sunset clouds and the hills beyond", "The view from the porch in autumn, over the street below.", "50% 45%"),
  exteriorPorchSnow: ph(exteriorPorchSnow, "Snow-covered porch floor behind brown wood railings and posts, looking past a bare tree across the street to snow-covered neighbouring houses and a parked white van under a clear blue sky", "The porch under snow, looking down the street.", "50% 55%"),
  exteriorIcicles: ph(exteriorIcicles, "Icicles hanging from the roof edge at sunset, seen past the corner of the house, with a bare tree, a snow-covered yard and a neighbouring white cottage beyond", "Icicles at the roof edge on a winter evening.", "55% 40%"),
  living: ph(p49, "Living room with a sage-green reclining sofa and mixed cushions, a pine coffee table on a striped rug, a large framed mirror, rose-coloured curtains, and a glowing floor lamp", "The living room, with a reclining sofa and warm lamplight.", "55% 55%"),
  livingWide: ph(p50, "Living room seen straight on, with the reclining sofa under a window, framed floral paintings, amber lamps on a floor stand and a side table, and dark wood floors", "The same room straight on, with two lamps and framed floral art."),
  bed: ph(bed, "Bedroom with a red-and-black patterned comforter, folded towels, a large wall-mounted TV, a wall clock, brown curtains, and an open door into a bathroom", "A made bed, a wall TV, and a door straight into the bathroom."),
  bedAlt: ph(bedAlt, "The same bedroom from the corner, with the red-and-black comforter, a cream throw, a wooden nightstand with a lamp, and a window with blinds and curtains", "The bed from the corner, with a nightstand and lamp."),
  desk: ph(p38, "Room with deep blue walls, two tall windows with blinds, a wooden desk with a monitor and keyboard, a blue upholstered desk chair, and a bed with a floral comforter", "A blue room with a desk by the window and a second bed."),
  kitchen: ph(kitchen, "Compact kitchen with pale blue cabinets, a double stainless sink, granite-look counters, a toaster oven, a stainless refrigerator, and a microwave on top", "Pale blue cabinets, a double sink, and a full-size refrigerator."),
  bath: ph(bath, "Bathroom with a tub and shower behind a mint curtain, a grab bar, a toilet with a cabinet above, a white vanity with a mirror cabinet, and a glass-block window", "Tub and shower, a vanity, and a glass-block window for daylight."),
  bathTub: ph(bathTub, "Tub and shower close up, with a chrome shower head and handle, a hanging wire caddy, the mint-green shower curtain, and the toilet beside the tub", "The tub and shower up close, with the caddy and curtain."),
  bedWide: ph(bedWide, "Bedroom seen from the doorway, with a red-and-black comforter, folded blue towels on the bed, a nightstand with a lamp, a wall clock and gold wall sculptures, an open white door, and a built-in wooden closet", "The bedroom from the door, with the closet beyond."),
  wsDesk: ph(wsDesk, "Corner desk with a dark wood top and built-in shelving above holding plants, a toy motorcycle and small boxes, with a black mesh office chair", "The corner desk, with shelving above."),
  wsRoom: ph(wsRoom, "Workspace room with the corner desk at left, a large framed abstract print, a doorway into the bedroom, a floral valance over a window, and a wall-mounted folding table", "The workspace room, with the desk, art and the bedroom door."),
  wsWide: ph(wsWide, "The workspace room seen from the kitchen side, with the corner desk and chair, a ceiling fan, a stainless refrigerator and microwave at left, and doorways to the bedroom and a utility area", "The same room from the kitchen side, with the desk and doorways."),
  laundry: ph(laundry, "Laundry alcove with a Maytag top-loading washer and an LG front-loading dryer, two wooden shelves above holding wicker baskets, detergent, paint cans and a cordless drill, and black pegboard panels with hanging cups on either wall", "The washer and dryer, with storage above.", "50% 45%"),
  laundryWide: ph(laundryWide, "The laundry alcove seen straight on, with the Maytag washer and LG dryer under wooden shelves holding wicker baskets, bottles and cans, and black pegboard panels on both side walls", "The laundry alcove straight on, with both shelves."),
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
      slug: "exterior",
      name: "Exterior",
      summary: "A single-storey home with a gabled entry porch, black shutters, and a lawn sloping up from the street.",
      photos: [photos.exterior, photos.exteriorViewAutumn, photos.exteriorPorchSnow, photos.exteriorIcicles],
      notes: [
        { text: "Tan siding, black shutters, and a brown shingle roof.", status: "photographed" },
        { text: "Gabled entry porch with wood railings and steps.", status: "photographed" },
        { text: "The front yard slopes up from the street.", status: "photographed" },
        { text: "The porch sits above the street and looks out over the rooftops opposite.", status: "photographed" },
        { text: "Snow sits on the porch and icicles hang from the roof edge in winter.", status: "photographed" },
        { text: "Whether off-street parking is available.", status: "confirm" },
      ],
    },
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
      faqs: [
        { q: "Is there somewhere comfortable to sit?", a: "Yes. A reclining sofa with cushions faces a coffee table on a striped rug, with a floor lamp and a table lamp.", status: "photographed" },
        { q: "Is there a TV in the living room?", a: "None is shown in the living-room photos; the bedroom has a wall-mounted TV. Ask us about the living room.", status: "confirm" },
      ],
    },
    {
      slug: "bedroom",
      name: "Bedroom",
      summary: "A made bed, a wall-mounted TV, a nightstand, and a door into the bathroom.",
      photos: [photos.bed, photos.bedAlt, photos.bedWide],
      notes: [
        { text: "Made bed with towels set out, a nightstand with a lamp, and a tall gold mirror.", status: "photographed" },
        { text: "Wall-mounted TV with a sound bar, and track lighting.", status: "photographed" },
        { text: "A built-in wooden closet stands beside the bedroom door.", status: "photographed" },
        { text: "A door from the bedroom opens into the bathroom.", status: "photographed" },
        { text: "Bed size.", status: "confirm" },
      ],
      faqs: [
        { q: "Can I reach the bathroom from the bedroom?", a: "Yes. A door from the bedroom opens straight into the bathroom.", status: "photographed" },
        { q: "Is there a TV in the bedroom?", a: "Yes. A wall-mounted TV with a sound bar faces the bed.", status: "photographed" },
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
      faqs: [
        { q: "Is there a place to work?", a: "A blue room with a wooden desk, a monitor and a desk chair is photographed, and fiber-optic internet is listed. Ask us whether this room is part of your stay.", status: "confirm" },
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
      faqs: [
        { q: "What can I cook with?", a: "The photo shows a toaster oven, a microwave, a double sink and a full-size refrigerator. A cooktop or range is not shown, so ask us before you plan meals around one.", status: "photographed" },
        { q: "Are cookware and dishes supplied?", a: "Ask us to confirm cookware and dishes for your stay.", status: "confirm" },
      ],
    },
    {
      slug: "workspace",
      name: "Workspace",
      summary: "A corner desk with built-in shelving, in its own room beside the kitchen and the bedroom.",
      photos: [photos.wsDesk, photos.wsRoom, photos.wsWide],
      notes: [
        { text: "Corner desk with a dark wood top, built-in shelves above, and a black mesh office chair.", status: "photographed" },
        { text: "Small lights under the upper shelf, and open shelving for books and plants.", status: "photographed" },
        { text: "An electrical outlet sits behind the desk.", status: "photographed" },
        { text: "Fiber-optic internet is listed for the home; the connection speed is not published.", status: "listed" },
        { text: "Whether a monitor is supplied.", status: "confirm" },
        { text: "Whether this room is part of the one-bedroom layout.", status: "confirm" },
        { text: "A washer and dryer are visible through the doorway into the laundry alcove.", status: "photographed" },
      ],
    },
    {
      slug: "laundry",
      name: "Laundry",
      summary: "A laundry alcove with a top-loading washer, a front-loading dryer, and shelves for supplies.",
      photos: [photos.laundryWide, photos.laundry],
      notes: [
        { text: "Maytag top-loading washer and LG front-loading dryer side by side.", status: "photographed" },
        { text: "Two wooden shelves above hold wicker baskets, detergent and cleaning supplies.", status: "photographed" },
        { text: "Black pegboard panels on both side walls, with hanging cups and bins.", status: "photographed" },
        { text: "Whether guests may use the washer and dryer during a stay.", status: "confirm" },
        { text: "Whether detergent or a drying rack is supplied.", status: "confirm" },
      ],
    },
    {
      slug: "bathroom",
      name: "Bathroom",
      summary: "A tub and shower with a grab bar, a vanity, and a glass-block window.",
      photos: [photos.bath, photos.bathTub],
      notes: [
        { text: "Tub with shower and curtain, a grab bar, a toilet, and a white vanity with a mirror cabinet.", status: "photographed" },
        { text: "Glass-block window and wall storage cabinet.", status: "photographed" },
        { text: "Whether there is more than one bathroom.", status: "confirm" },
      ],
      faqs: [
        { q: "Is it a tub or a shower?", a: "A tub with a shower and curtain, plus a grab bar on the wall.", status: "photographed" },
        { q: "What if something drips or clogs?", a: "Send the home, the room, the problem, the timing and a helpful photo through the maintenance path. For fire, major flooding or immediate danger, call 911 first, then resident support.", status: "confirmed" },
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
      faqs: [
        { q: "Is the front door covered?", a: "Yes. A covered porch with wood posts and railings sits just outside the front door. Ask us about porch seating.", status: "photographed" },
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
  guide: residentGuide({
    id: "buck",
    internet: { text: "Internet: fiber-optic, per the listing.", status: "listed" },
    laundry: { text: "Laundry: access is listed; whether the washer and dryer are in the home is confirmed on inquiry.", status: "listed" },
  }),
};
