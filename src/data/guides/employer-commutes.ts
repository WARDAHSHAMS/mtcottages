/**
 * Sample guide for the content engine (#47): measured drive times from every
 * Mt Cottages home to the Mid-Ohio Valley's large employers. Targets the
 * corporate and relocation rows of docs/marketing/keyword-universe.csv
 * ("housing near chemours washington works").
 *
 * Every number on the page comes from _data/distances.json through
 * driveMatrix(); the prose quotes those figures through template strings, so
 * a re-measurement updates the page and nothing is typed by hand. Homes
 * without an approved street address are measured from their town centre,
 * and the page says so beside each of their figures.
 */
import { homes } from "../homes";
import { driveMatrix, formatMeasured, type DriveFromHome, type DriveMatrixRow } from "../distances";
import type { ChartSpec, GuideArticle } from "./types";

const EMPLOYERS = ["chemours-washington-works", "fiscal-service-parkersburg", "constellium-ravenswood", "wvu-parkersburg"] as const;

const matrix = driveMatrix([...EMPLOYERS], homes);
const byId = new Map<string, DriveMatrixRow>(matrix.map((row) => [row.destination, row]));
const employer = (id: (typeof EMPLOYERS)[number]): DriveMatrixRow => {
  const row = byId.get(id);
  if (!row || row.drives.length === 0) throw new Error(`employer-commutes: no measured drives to ${id}`);
  return row;
};

/** "Broad Cottage" or "Buck Cottage (from the Parkersburg town centre)". */
const fromLabel = (drive: DriveFromHome) => {
  if (drive.originKind === "address") return drive.homeName;
  const home = homes.find((candidate) => candidate.id === drive.homeId);
  return `${drive.homeName} (from the ${home?.town.name ?? "town"} centre)`;
};
const about = (drive: DriveFromHome) => `about ${drive.minutes} min`;
/**
 * The short answers compare homes with a published address only: a figure
 * measured from a town centre says nothing exact about the home, so it never
 * wins "nearest" or "farthest" (the chart still shows it, labelled).
 */
const addressed = (id: (typeof EMPLOYERS)[number]): DriveFromHome[] => {
  const drives = employer(id).drives.filter((candidate) => candidate.originKind === "address");
  if (drives.length === 0) throw new Error(`employer-commutes: no home with a published address has a measured drive to ${id}`);
  return drives;
};
const nearest = (id: (typeof EMPLOYERS)[number]) => addressed(id)[0];
/** The measured drive from one home; throws when it was never measured, so the prose cannot quote a missing figure. */
const drive = (id: (typeof EMPLOYERS)[number], homeId: string): DriveFromHome => {
  const found = employer(id).drives.find((candidate) => candidate.homeId === homeId);
  if (!found) throw new Error(`employer-commutes: no measured drive from ${homeId} to ${id}`);
  return found;
};
const farthest = (id: (typeof EMPLOYERS)[number]) => addressed(id).at(-1) as DriveFromHome;

const measuredDates = [...new Set(matrix.flatMap((row) => row.drives.map((drive) => drive.measured)))].sort();
const measuredText = measuredDates.length === 1 ? formatMeasured(measuredDates[0]) : `${formatMeasured(measuredDates[0])} to ${formatMeasured(measuredDates.at(-1) as string)}`;
const sourceUrl = matrix[0].drives[0].sourceUrl;

const chart: ChartSpec = {
  id: "employer-drives",
  title: "Drive times from each home to the valley's large employers",
  subtitle: "About this many minutes by car, with no traffic. Nearest home first.",
  valueHeading: "Drive",
  groups: matrix.map((row) => ({
    label: row.label,
    bars: row.drives.map((drive) => ({
      label: fromLabel(drive),
      value: drive.minutes,
      valueText: `${drive.minutes} min`,
      note: `${drive.miles} mi, measured ${formatMeasured(drive.measured)}`,
    })),
  })),
  method: `Driving routes on OpenStreetMap roads from the public OSRM router, measured ${measuredText}. The router assumes free-flowing traffic, so each time is rounded up to the next whole minute. Only measured pairs are shown; a home missing from a group has no measurement to that site yet.`,
  sourceLabel: "OSRM route data",
  sourceUrl,
};

const chemours = nearest("chemours-washington-works");
const fiscal = nearest("fiscal-service-parkersburg");
const constellium = nearest("constellium-ravenswood");
const wvup = nearest("wvu-parkersburg");
const chemoursFar = farthest("chemours-washington-works");

export const employerCommutes: GuideArticle = {
  slug: "commute-times-to-mid-ohio-valley-employers",
  seoTitle: "Commute Times to Mid-Ohio Valley Employers",
  description: `Measured drive times from each Mt Cottages home to Chemours Washington Works, the Bureau of the Fiscal Service, Constellium Ravenswood and WVU Parkersburg.`,
  h1: "Commute times from our homes to the valley's large employers",
  lede: `Starting a contract or a new role at a plant, a federal office or the college? Here is how long the drive is from each furnished Mt Cottages home, measured by road, so you can pick the home that fits the commute.`,
  published: "2026-11-15",
  updated: "2026-11-15",
  towns: ["parkersburg", "ravenswood", "marietta"],
  topics: ["commuting", "moving"],
  audiences: ["crew", "relocation"],
  homeIds: homes.map((home) => home.id),
  sections: [
    {
      id: "short-answer",
      heading: "The nearest home to each employer",
      blocks: [
        {
          kind: "list",
          items: [
            `Chemours Washington Works: ${fromLabel(chemours)}, ${about(chemours)}. The longest drive is from ${fromLabel(chemoursFar)}, ${about(chemoursFar)}.`,
            `Bureau of the Fiscal Service, downtown Parkersburg: ${fromLabel(fiscal)}, ${about(fiscal)}.`,
            `Constellium Ravenswood: ${fromLabel(constellium)}, ${about(constellium)}.`,
            `WVU Parkersburg: ${fromLabel(wvup)}, ${about(wvup)}.`,
          ],
        },
        { kind: "p", text: "Each line names the nearest home with a published street address. Buck and Virginia Cottages share their address once you inquire, so the chart below measures them from their town centre; ask us for their exact drive." },
        { kind: "p", text: "These are free-flow times from the router, rounded up. Allow extra time at shift change, in school traffic and in snow." },
      ],
    },
    {
      id: "drive-times",
      heading: "Drive times to each employer",
      blocks: [
        { kind: "p", text: "Each group is one employer; each bar is one home. The figures, with their distances and measurement dates, are in the table under the chart." },
        { kind: "chart", chart },
      ],
    },
    {
      id: "which-home",
      heading: "Which home fits which commute",
      blocks: [
        { kind: "p", text: `Broad and Oak Cottages are in Parkersburg, ${about(drive("fiscal-service-parkersburg", "broad"))} and ${about(drive("fiscal-service-parkersburg", "oak"))} from the Bureau of the Fiscal Service, and the nearest of our homes with a published address to Washington Works (${about(drive("chemours-washington-works", "broad"))} and ${about(drive("chemours-washington-works", "oak"))}). Buck Cottage is also in Parkersburg; its street address is shared once you inquire, so its figures are measured from the town centre.` },
        { kind: "p", text: `Henrietta and Virginia Cottages are in Ravenswood, where Constellium is ${about(drive("constellium-ravenswood", "henrietta"))} from Henrietta Cottage. Virginia Cottage's address is shared on inquiry, so its figures come from the Ravenswood town centre.` },
        { kind: "p", text: "Frederick Cottage is across the river in Marietta, Ohio. It suits a role in Marietta, or a household where one person works in Parkersburg and the other in Marietta; the chart shows what the Parkersburg drive costs." },
      ],
    },
    {
      id: "how-a-stay-works",
      heading: "How a stay inquiry works",
      blocks: [
        {
          kind: "diagram",
          diagram: {
            id: "inquiry-steps",
            title: "From inquiry to arrival, in four steps",
            steps: [
              { label: "Send your dates", detail: "Your start and end dates, who is coming, and where you work." },
              { label: "We confirm in writing", detail: "Availability, the monthly rate and the next step for the home that fits." },
              { label: "Agreement", detail: "Any screening and the agreement are a separate step after the inquiry." },
              { label: "Arrive", detail: "Arrival details for the home, and who to call once you are in." },
            ],
          },
        },
        { kind: "p", text: "An inquiry is a conversation, not a lease or an approval. Shift patterns, parking for a work vehicle and stays longer than a contract are all things to raise when you write; we confirm what each home offers on inquiry." },
      ],
    },
    {
      id: "next-step",
      heading: "Next step",
      blocks: [
        { kind: "cta", heading: "Tell us where you will be working.", text: "Send your dates and the site you report to, and we will say which home makes the shortest commute and whether it is free." },
      ],
    },
  ],
  sources: [
    { label: "OSRM public router, driving profile (route data)", url: sourceUrl },
    { label: "OpenStreetMap copyright and licence (ODbL 1.0)", url: "https://www.openstreetmap.org/copyright" },
  ],
};
