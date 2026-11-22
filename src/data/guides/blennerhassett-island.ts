/**
 * Visitor guide (#50): Blennerhassett Island Historical State Park, reached by
 * sternwheeler from Parkersburg, WV. Targets "blennerhassett island ferry
 * schedule" and "blennerhassett island tickets price".
 *
 * Every season date, boat time and price comes from the park's own published
 * operating schedule (West Virginia State Parks), read on the date in
 * `checked`, and the page names the season those figures describe. The park
 * has not published a schedule for the next season, so the page says so and
 * gives only the park's own standing rule (early May to the end of October).
 * The package saving is worked out here from the listed prices, and the build
 * stops if the published package is not cheaper, so a changed price sheet
 * cannot leave the page claiming a saving that is gone.
 *
 * Street numbers are left out on purpose: the museum and the lots are named by
 * street, which is enough to find them and keeps the address guard simple.
 * Drives from our Parkersburg homes come from _data/distances.json through
 * driveMatrix(); homes without an approved street address are measured from
 * the town centre and labelled so. Stays are 30 nights or more (#68, D3), so
 * the call to action is a month in Parkersburg, never a day trip booking.
 */
import { homes } from "../homes";
import { driveMatrix, formatMeasured, type DriveFromHome } from "../distances";
import type { ChartSpec, GuideArticle } from "./types";

/** The day the park's pages and schedule were read for this guide. */
const checked = "2026-11-22";
/** The season the park's published operating schedule describes. */
const season = 2026;
const nextSeason = season + 1;

/** One line of the park's admission rates, in US dollars; children are ages 3 to 12. */
type Rate = { item: string; adult: number; child: number; where: string };
const rates = {
  museum: { item: "Museum admission", adult: 4, child: 2, where: "at the museum" },
  boat: { item: "Sternwheeler ride to the island (round trip)", adult: 12, child: 8, where: "at the museum, at Point Park or at the Welcome Center" },
  mansion: { item: "Guided mansion tour", adult: 5, child: 3, where: "at the island ticket booth" },
  wagon: { item: "Narrated horse-drawn wagon ride", adult: 13, child: 11, where: "at the island ticket booth" },
} satisfies Record<string, Rate>;
const packageTicket = { adult: 33, child: 23 };

const usd = (value: number) => `$${value}`;
const separately = (age: "adult" | "child") => Object.values(rates).reduce((sum, rate) => sum + rate[age], 0);
const saving = { adult: separately("adult") - packageTicket.adult, child: separately("child") - packageTicket.child };
if (saving.adult <= 0 || saving.child <= 0) {
  throw new Error(`blennerhassett-island: the package (${usd(packageTicket.adult)} / ${usd(packageTicket.child)}) is no longer cheaper than the four tickets bought separately (${usd(separately("adult"))} / ${usd(separately("child"))}); re-read the park's rates and rewrite the tickets section`);
}
const savingText = (age: "adult" | "child") => `${usd(saving[age])} less than the four tickets bought one by one (${usd(separately(age))})`;

const parkersburgHomes = homes.filter((home) => home.town.slug === "parkersburg");
if (parkersburgHomes.length === 0) throw new Error("blennerhassett-island: no Parkersburg homes in src/data/homes");
const [downtown] = driveMatrix(["downtown-parkersburg"], parkersburgHomes);
if (!downtown || downtown.drives.length === 0) throw new Error("blennerhassett-island: no measured drives from a Parkersburg home to downtown Parkersburg");

const fromLabel = (drive: DriveFromHome) => (drive.originKind === "address" ? drive.homeName : `${drive.homeName} (from the Parkersburg centre)`);
const measuredDates = [...new Set(downtown.drives.map((drive) => drive.measured))].sort();
const measuredText = measuredDates.length === 1 ? formatMeasured(measuredDates[0]) : `${formatMeasured(measuredDates[0])} to ${formatMeasured(measuredDates.at(-1) as string)}`;

const chart: ChartSpec = {
  id: "downtown-drives",
  title: "Drive from our Parkersburg homes to downtown Parkersburg",
  subtitle: "About this many minutes by car, with no traffic. The boat landing and the museum are downtown.",
  valueHeading: "Drive",
  groups: [
    {
      label: downtown.label,
      bars: downtown.drives.map((drive) => ({
        label: fromLabel(drive),
        value: drive.minutes,
        valueText: `${drive.minutes} min`,
        note: `${drive.miles} mi, measured ${formatMeasured(drive.measured)}`,
      })),
    },
  ],
  method: `Driving routes on OpenStreetMap roads from the public OSRM router to ${downtown.name}, measured ${measuredText}, rounded up to the next whole minute. Only measured pairs are shown; a home without a published street address would be measured from the Parkersburg town centre and labelled so.`,
  sourceLabel: "OSRM route data",
  sourceUrl: downtown.drives[0].sourceUrl,
};

const parkSchedule = "https://wvstateparks.com/wp-content/uploads/2026/09/Island-Schedule-Draft-2026-for-merge.docx.pdf";

export const blennerhassettIsland: GuideArticle = {
  slug: "blennerhassett-island-ferry-tickets-season",
  seoTitle: "Blennerhassett Island: Ferry, Tickets, Season",
  description: `Blennerhassett Island, Parkersburg, WV: the ${season} season, sternwheeler times from Point Park, ticket prices, the package ticket and how to plan a visit.`,
  h1: "Visiting Blennerhassett Island: the sternwheeler, tickets and season",
  lede: "Blennerhassett Island sits in the Ohio River just off downtown Parkersburg, WV. A sternwheeler carries visitors from Point Park to a replica Palladian mansion, narrated wagon rides and self-guided walks. Here is what West Virginia State Parks publishes about the season, the boat and the tickets, and how to check it before you go.",
  published: checked,
  updated: checked,
  towns: ["parkersburg"],
  topics: ["things-to-do", "family"],
  audiences: ["long-term", "visitor"],
  homeIds: parkersburgHomes.map((home) => home.id),
  sections: [
    {
      id: "season",
      heading: "When the island is open",
      blocks: [
        {
          kind: "list",
          items: [
            "The rule: West Virginia State Parks opens the island from early May until the end of October each year. It is a day-use park and is closed from November to April.",
            `${season}: opening day was Friday, May 1. Until Labor Day the island was open Tuesday to Sunday, 10:00 AM to 4:30 PM, and it was open on Memorial Day and Labor Day.`,
            `${season}, after Labor Day: Wednesday to Sunday in September, then Thursday to Sunday in October, 11:00 AM to 4:30 PM, until October 31. The island closed at 2:30 PM on October 10 and 11 and was closed on October 12, so check autumn dates.`,
            `${nextSeason}: the park had not published its ${nextSeason} schedule when we checked on ${formatMeasured(checked)}. Expect early May to the end of October, and confirm the days and times on the park's page before you plan around them.`,
          ],
        },
        { kind: "p", text: `The times and prices on this page are the ones the park published for ${season}. The park's own sheet says rates and hours are subject to change and asks visitors to call ahead, so check the park's page (linked under Sources) for the year you are going.` },
      ],
    },
    {
      id: "sternwheeler",
      heading: "The sternwheeler from Point Park",
      blocks: [
        {
          kind: "list",
          items: [
            "The boat leaves from Point Park in downtown Parkersburg on the hour and comes back from the island on the half hour.",
            "The last boat to the island leaves at 3:00 PM. The park suggests allowing at least three hours for a complete visit, including the round trip.",
            "You can bring a bicycle on the boat, or rent one on the island by the half hour or the hour. Riders 15 and under must wear a helmet.",
          ],
        },
        {
          kind: "diagram",
          diagram: {
            id: "island-visit",
            title: "A visit to Blennerhassett Island, in order",
            steps: [
              { label: "Tickets", detail: "Buy the package at the museum on Juliana Street, or a boat ticket at Point Park." },
              { label: "Point Park", detail: "Board the sternwheeler on the hour; the last boat out is at 3:00 PM." },
              { label: "The island", detail: "Mansion tour, narrated wagon ride, a self-guided walk or a rented bike." },
              { label: "Back", detail: "Boats return on the half hour; allow at least three hours in all." },
            ],
          },
        },
      ],
    },
    {
      id: "tickets",
      heading: "Tickets and prices",
      blocks: [
        { kind: "p", text: `The ${season} prices the park lists, for adults and for children 3 to 12:` },
        {
          kind: "list",
          items: [
            `Package ticket (museum, boat, mansion tour and wagon ride): ${usd(packageTicket.adult)} adults, ${usd(packageTicket.child)} children, sold at the museum. That is ${savingText("adult")} for an adult, and ${savingText("child")} for a child.`,
            ...Object.values(rates).map((rate) => `${rate.item}: ${usd(rate.adult)} adults, ${usd(rate.child)} children, sold ${rate.where}.`),
          ],
        },
        { kind: "p", text: "Tickets can also be bought online through West Virginia State Parks reservations, or by phone through the park. The mansion tours are led by volunteers in period costume." },
      ],
    },
    {
      id: "museum-parking",
      heading: "The museum and parking",
      blocks: [
        { kind: "p", text: "The Blennerhassett Museum of Regional History is on Juliana Street in downtown Parkersburg, with three floors of regional history. It sells the package ticket and is open all year except Thanksgiving Day and the days from December 22 through January 1, so it is a place to go even when the island is closed. It is open Tuesday to Sunday, and on Mondays by appointment; hours change with the season." },
        {
          kind: "list",
          items: [
            "Dedicated parking beside the museum on Juliana Street.",
            "A lot on Ann Street under the bridge overpass.",
            "Limited three-hour parking at Point Park, which can be short for a full island visit.",
          ],
        },
        { kind: "p", text: "The park's pages do not describe step-free access to the boat, the island paths or the mansion. If anyone in your group needs it, ask the park before you go." },
      ],
    },
    {
      id: "staying",
      heading: "Making it a month in Parkersburg",
      blocks: [
        { kind: "p", text: "Mt Cottages homes are furnished stays of 30 nights or more, so we do not offer day-trip or weekend bookings. If you are working a contract, moving to the valley or spending a season near family, a month between May and October puts the island within an easy afternoon." },
        { kind: "chart", chart },
        { kind: "cta", heading: "Spend a season in Parkersburg.", text: "Send your dates and what brings you to the valley, and we will confirm which Parkersburg home is free for your month." },
      ],
    },
  ],
  sources: [
    { label: `West Virginia State Parks: Blennerhassett Island Historical State Park (read ${formatMeasured(checked)})`, url: "https://wvstateparks.com/park/blennerhassett-island-historical-state-park/" },
    { label: `West Virginia State Parks: Blennerhassett Island additional information, season and parking (read ${formatMeasured(checked)})`, url: "https://wvstateparks.com/parks/blennerhassett-island-historical-state-park/additional-information/" },
    { label: `West Virginia State Parks: Blennerhassett Island ${season} operating schedule and admission rates (read ${formatMeasured(checked)})`, url: parkSchedule },
    { label: "West Virginia State Parks reservations: Blennerhassett Island activities", url: "https://reservations.wvstateparks.com/v2/products/activities?s_dest_id=754" },
    { label: "OSRM public router, driving profile (route data)", url: downtown.drives[0].sourceUrl },
  ],
};
