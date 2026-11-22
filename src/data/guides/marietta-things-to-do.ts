/**
 * "Things to do in Marietta, Ohio" (#51). Targets the Marietta things-to-do
 * rows of docs/marketing/keyword-universe.csv, and says Marietta, Ohio, all
 * the way through so nobody mistakes it for Marietta, Georgia.
 *
 * Every place listed links to its own operator's page (sources below), read
 * on the date in `checked`. Hours and prices are quoted only where the
 * operator publishes them, with "check before you go". Drive and walk times
 * from Frederick Cottage come from _data/distances.json (measuredWalk and
 * driveMatrix), never typed: a place with no measured walk gets no walk time.
 *
 * Stays are 30 nights or more (owner decision on #68), so the call to action
 * is a month in Marietta, never a weekend.
 */
import { homes } from "../homes";
import { driveMatrix, formatMeasured, measuredWalk } from "../distances";
import type { ChartBar, GuideArticle } from "./types";

/** The day the operators' pages were read for this guide. */
const checked = "2026-11-22";

const frederick = homes.find((home) => home.id === "frederick");
if (!frederick) throw new Error("marietta-things-to-do: no Frederick Cottage in src/data/homes");

const DRIVES = ["campus-martius", "downtown-marietta", "marietta-college"] as const;
const drives = driveMatrix([...DRIVES], [frederick]).map((row) => {
  const drive = row.drives.find((candidate) => candidate.homeId === "frederick");
  if (!drive) throw new Error(`marietta-things-to-do: no measured drive from Frederick Cottage to ${row.destination}`);
  return { id: row.destination, name: row.label, drive };
});
const driveTo = (id: (typeof DRIVES)[number]) => {
  const found = drives.find((row) => row.id === id);
  if (!found) throw new Error(`marietta-things-to-do: no drive row for ${id}`);
  return found.drive;
};

// Walks exist only where they were measured; Campus Martius has none, so the page claims none.
const WALKS = [
  { id: "downtown-marietta", label: "Downtown Marietta" },
  { id: "marietta-college", label: "Marietta College" },
] as const;
const walks = WALKS.map((walk) => ({ ...walk, route: measuredWalk("frederick", walk.id) }));
const walkDowntown = walks[0].route;

const minutesBar = (label: string, minutes: number, miles: number, measured: string): ChartBar => ({
  label,
  value: minutes,
  valueText: `${minutes} min`,
  note: `${miles} miles, measured ${formatMeasured(measured)}`,
});

const campusMartius = driveTo("campus-martius");
const downtown = driveTo("downtown-marietta");

export const mariettaThingsToDo: GuideArticle = {
  slug: "things-to-do-in-marietta-ohio",
  seoTitle: "Things to Do in Marietta, Ohio: Local Guide",
  description: "Things to do in Marietta, Ohio: Campus Martius Museum, Mound Cemetery, the River Trail, the Valley Gem, downtown dining and the Sternwheel Festival.",
  h1: "Things to do in Marietta, Ohio",
  lede: "Marietta, Ohio, sits where the Muskingum River meets the Ohio, in Washington County, across the river from West Virginia (not Marietta, Georgia). It was the first organized American settlement in the Northwest Territory, and most of what there is to do is history, the rivers and a walkable downtown. Here is what each place publishes about itself, with its own link.",
  published: checked,
  updated: checked,
  towns: ["marietta"],
  topics: ["things-to-do"],
  audiences: ["visitor", "long-term"],
  homeIds: ["frederick"],
  sections: [
    {
      id: "history",
      heading: "History: Campus Martius and Mound Cemetery",
      blocks: [
        {
          kind: "p",
          text: "Campus Martius Museum stands on the site of Campus Martius, the fort the first settlers built in 1788, and keeps the home of General Rufus Putnam inside its walls, across three floors of exhibits. The Friends of the Museums operate it for the Ohio History Connection.",
        },
        {
          kind: "list",
          items: [
            "Open Monday to Saturday, 9:30 AM to 5 PM, and Sunday, noon to 5 PM, as the museum lists its hours.",
            "Admission: adults $10; students from kindergarten to college (with ID) $5; active-duty military and veterans $5; children 5 and under and members free.",
            "Closed on New Year's Day, Easter, Thanksgiving, Christmas Eve and Christmas Day.",
            `Frederick Cottage is about ${campusMartius.minutes} minutes away by car (${campusMartius.miles} miles, measured ${formatMeasured(campusMartius.measured)}).`,
          ],
        },
        {
          kind: "p",
          text: "Mound Cemetery, in the heart of the city, grows around the Conus Mound, a 30-foot ceremonial mound the visitors bureau dates to about 2,000 years ago (the Adena people). The City of Marietta says more Revolutionary War officers are buried there than at any other place in America.",
        },
        { kind: "p", text: `Hours and prices change, so check the museum's own page (under Sources) before you go. We read it on ${formatMeasured(checked)}.` },
      ],
    },
    {
      id: "rivers",
      heading: "The rivers: the River Trail and the Valley Gem",
      blocks: [
        {
          kind: "p",
          text: "The City of Marietta's River Trail is a paved path of about 3.3 miles that follows the river from the Indian Acres boat ramp to East 8th and Jefferson Streets. Beyond it, the Marietta Trail Network adds about 15 miles of off-road trails, maintained by the River Valley Mountain Bike Association, which the city lists on the same page.",
        },
        {
          kind: "p",
          text: "The Valley Gem sternwheeler runs river cruises from its landing on Front Street in downtown Marietta, Ohio, including holiday cruises from November into December. Its own site lists each cruise and how to book.",
        },
        {
          kind: "p",
          text: "The Ohio River Museum and the W.P. Snyder Jr., a historic paddle-wheel riverboat, are closed while a new Ohio River Museum is built. The museum gives no reopening date yet, so check its page before you plan around it.",
        },
      ],
    },
    {
      id: "downtown",
      heading: "The historic downtown and where to eat",
      blocks: [
        {
          kind: "p",
          text: `Downtown Marietta, Ohio, is a grid of brick streets along Front Street and the levee, with shops, restaurants and the riverfront. Marietta Main Street, the downtown non-profit, keeps directories of downtown dining and shopping and runs First Fridays each month. From Frederick Cottage, the courthouse downtown is about ${walkDowntown.minutes} minutes on foot (${walkDowntown.miles} miles) or ${downtown.minutes} minutes by car.`,
        },
        {
          kind: "p",
          text: "For food, the Marietta-Washington County Convention and Visitors Bureau keeps the official dining directory, grouped by kind (breweries and wineries, coffee and dessert, river views, fine dining and more). We do not rank restaurants: use the directories linked below, which the businesses keep up to date.",
        },
      ],
    },
    {
      id: "from-frederick",
      heading: "Getting there from Frederick Cottage",
      blocks: [
        {
          kind: "chart",
          chart: {
            id: "marietta-from-frederick",
            title: "From Frederick Cottage, Marietta, Ohio",
            subtitle: "Minutes by car and, where we measured it, on foot",
            valueHeading: "Time",
            groups: [
              { label: "By car", bars: drives.map((row) => minutesBar(row.name, row.drive.minutes, row.drive.miles, row.drive.measured)) },
              { label: "On foot", bars: walks.map((walk) => minutesBar(walk.label, walk.route.minutes, walk.route.miles, walk.route.measured)) },
            ],
            method: "Drive and walk times from Frederick Cottage, routed on OpenStreetMap data (OSRM). Real trips vary with traffic, parking and pace. Campus Martius has no measured walk, so it shows only a drive.",
            sourceLabel: "OSRM public router (route data)",
            sourceUrl: drives[0].drive.sourceUrl,
          },
        },
      ],
    },
    {
      id: "festival",
      heading: "The Sternwheel Festival in September",
      blocks: [
        {
          kind: "p",
          text: "The Ohio River Sternwheel Festival fills the Marietta levee with paddle-wheel boats, music and fireworks on the weekend after Labor Day. Admission is free. Our Sternwheel Festival guide has the dates, parking and the free trolley.",
        },
      ],
    },
    {
      id: "staying",
      heading: "A month in Marietta, Ohio",
      blocks: [
        {
          kind: "p",
          text: "Mt Cottages homes are furnished stays of 30 nights or more, for people moving to the valley, working a contract or spending a season near family. A month gives you time for the museum, the trail and a few First Fridays.",
        },
        { kind: "cta", heading: "Spend a month in Marietta, Ohio.", text: "Send your dates and what brings you to the valley, and we will confirm whether Frederick Cottage is free." },
      ],
    },
  ],
  sources: [
    { label: `Campus Martius Museum: plan your visit, hours and admission (read ${formatMeasured(checked)})`, url: "https://mariettamuseums.org/plan-your-visit/" },
    { label: `Ohio River Museum: closed for the new museum (read ${formatMeasured(checked)})`, url: "https://mariettamuseums.org/ohio-river-museum" },
    { label: `Marietta-Washington County CVB: Marietta history, Campus Martius and the Conus Mound (read ${formatMeasured(checked)})`, url: "https://mariettaohio.org/history/" },
    { label: `City of Marietta: trails, the River Trail and the Marietta Trail Network (read ${formatMeasured(checked)})`, url: "https://www.mariettaoh.net/services/parks_and_recreation/trails.php" },
    { label: `City of Marietta: cemeteries, including Mound Cemetery (read ${formatMeasured(checked)})`, url: "https://www.mariettaoh.net/services/public_works/cemetery.php" },
    { label: `Valley Gem Sternwheeler, official site (read ${formatMeasured(checked)})`, url: "https://valleygemsternwheeler.com/" },
    { label: `Marietta Main Street: downtown dining, shopping and First Fridays (read ${formatMeasured(checked)})`, url: "https://www.mariettamainstreet.org/" },
    { label: `Marietta-Washington County CVB: dining directory (read ${formatMeasured(checked)})`, url: "https://mariettaohio.org/categories/dine/" },
    { label: `Ohio River Sternwheel Festival, official site (read ${formatMeasured(checked)})`, url: "https://sternwheel.org/" },
    { label: "Mt Cottages: the Sternwheel Festival guide", url: "https://mtcottages.com/guides/marietta-ohio-sternwheel-festival/" },
    { label: "OSRM public router, driving profile (route data)", url: drives[0].drive.sourceUrl },
    { label: "FOSSGIS routing, foot profile (walk data)", url: "https://routing.openstreetmap.de/" },
  ],
};
