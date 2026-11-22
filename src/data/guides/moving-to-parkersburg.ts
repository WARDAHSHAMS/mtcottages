/**
 * Relocation guide (#48): moving to Parkersburg, West Virginia. Targets the
 * "moving to", population and cost-of-living Parkersburg rows of
 * docs/marketing/keyword-universe.csv, for persona P4 (relocating families and
 * new hires).
 *
 * Every figure comes from a data file: population and Fair Market Rents from
 * _data/area-stats.json (Census Bureau and HUD files, refreshed by
 * scripts/area-stats.py), the employer list from the same file (transcribed
 * from its cited publication), and drive times from _data/distances.json
 * through driveMatrix(). The prose quotes those values through template
 * strings, so nothing is typed by hand. Charts and diagrams only: no area photo.
 */
import { homes } from "../homes";
import { driveMatrix, formatMeasured, type DriveFromHome, type DriveMatrixRow } from "../distances";
import { areaStats, formatCount, formatDollars, percentChange, populationOf, rentArea, rentSizes } from "../areaStats";
import { publishedLuxuryFurnishedRates } from "../site";
import type { ChartSpec, GuideArticle } from "./types";

const parkersburgHomes = homes.filter((home) => home.town.slug === "parkersburg");
if (parkersburgHomes.length === 0) throw new Error("moving-to-parkersburg: no Parkersburg homes");

// Population (Census Bureau estimates).
const { population, fairMarketRent, employers } = areaStats;
const city = populationOf("parkersburg");
const vienna = populationOf("vienna");
const county = populationOf("wood-county");
const estimateYear = population.estimateDate.slice(0, 4);

const populationChart: ChartSpec = {
  id: "population",
  title: "How many people live in Parkersburg, Vienna and Wood County",
  subtitle: `Resident population, Census Bureau estimate for July 1, ${estimateYear}.`,
  valueHeading: "Residents",
  groups: [{
    label: `July ${estimateYear} estimate`,
    bars: [county, city, vienna].map((place) => ({
      label: place.label,
      value: place.estimate,
      valueText: formatCount(place.estimate),
      note: `April 2020 estimates base ${formatCount(place.base2020)} (${percentChange(place.base2020, place.estimate)})`,
    })),
  }],
  method: `Vintage ${population.vintage} population estimates from the U.S. Census Bureau, for July 1, ${estimateYear}, compared with the April 1, 2020 estimates base. Parkersburg and Vienna are separate cities inside Wood County; the county figure includes both.`,
  sourceLabel: population.source.label,
  sourceUrl: population.source.url,
};

// Jobs (sourced employer list).
const topEmployer = employers.list[0];
const employerChart: ChartSpec = {
  id: "employers",
  title: `The ${employers.list.length} largest employers in ${employers.area}`,
  subtitle: "Number of employees, as listed by Wood County Economic Development. Largest first.",
  valueHeading: "Employees",
  groups: [{
    label: employers.area,
    bars: [...employers.list].sort((a, b) => b.employees - a.employees).map((employer) => ({
      label: employer.name,
      value: employer.employees,
      valueText: formatCount(employer.employees),
    })),
  }],
  method: "Employee counts as listed by Wood County Economic Development and published in May 2025. Washington Works counts the plant's three companies together. Counts change; check with the employer.",
  sourceLabel: employers.source.label,
  sourceUrl: employers.source.url,
};

// Housing costs (HUD Fair Market Rents).
const metro = rentArea("parkersburg-vienna");
const marietta = rentArea("washington-county-oh");
const rentChart: ChartSpec = {
  id: "fair-market-rent",
  title: `What an unfurnished rental costs, FY${fairMarketRent.fiscalYear}`,
  subtitle: "HUD Fair Market Rent per month, rent plus utilities, by bedroom count.",
  valueHeading: "Per month",
  groups: [metro, marietta].map((area) => ({
    label: area.label,
    bars: area.rents.map((rent, size) => ({ label: rentSizes[size], value: rent, valueText: formatDollars(rent) })),
  })),
  method: `HUD sets a Fair Market Rent for each area every year: the gross rent (rent plus tenant-paid utilities) of a standard-quality, unfurnished rental, at the 40th percentile of recent movers' rents. These are the FY${fairMarketRent.fiscalYear} figures for the Parkersburg-Vienna metro and for Washington County, Ohio, across the river. Actual listings vary by street and condition.`,
  sourceLabel: fairMarketRent.source.label,
  sourceUrl: fairMarketRent.source.url,
};
const twoBedroom = metro.rents[2];
const threeBedroom = metro.rents[3];

// Commutes (measured drives).
const DESTINATIONS = ["camden-clark", "fiscal-service-parkersburg", "chemours-washington-works", "wvu-parkersburg", "parkersburg-high-school", "kroger-7th-parkersburg"];
const matrix = driveMatrix(DESTINATIONS, parkersburgHomes);
const byId = new Map<string, DriveMatrixRow>(matrix.map((row) => [row.destination, row]));
const fromLabel = (drive: DriveFromHome) => (drive.originKind === "address" ? drive.homeName : `${drive.homeName} (from the Parkersburg centre)`);
const addressed = (destination: string): DriveFromHome[] => {
  const drives = byId.get(destination)?.drives.filter((drive) => drive.originKind === "address") ?? [];
  if (drives.length === 0) throw new Error(`moving-to-parkersburg: no home with a published address has a measured drive to ${destination}`);
  return drives;
};
const range = (destination: string) => {
  const drives = addressed(destination);
  const low = Math.min(...drives.map((drive) => drive.minutes));
  const high = Math.max(...drives.map((drive) => drive.minutes));
  return low === high ? `about ${low} min` : `about ${low} to ${high} min`;
};
const measuredDates = [...new Set(matrix.flatMap((row) => row.drives.map((drive) => drive.measured)))].sort();
const measuredText = measuredDates.length === 1 ? formatMeasured(measuredDates[0]) : `${formatMeasured(measuredDates[0])} to ${formatMeasured(measuredDates.at(-1) as string)}`;
const driveSource = matrix.find((row) => row.drives.length > 0)?.drives[0].sourceUrl;
if (!driveSource) throw new Error("moving-to-parkersburg: no measured drives");

const commuteChart: ChartSpec = {
  id: "parkersburg-drives",
  title: "Drive times from our Parkersburg homes",
  subtitle: "About this many minutes by car, with no traffic. Nearest home first.",
  valueHeading: "Drive",
  groups: matrix.filter((row) => row.drives.length > 0).map((row) => ({
    label: row.label,
    bars: row.drives.map((drive) => ({ label: fromLabel(drive), value: drive.minutes, valueText: `${drive.minutes} min`, note: `${drive.miles} mi, measured ${formatMeasured(drive.measured)}` })),
  })),
  method: `Driving routes on OpenStreetMap roads from the public OSRM router, measured ${measuredText}, rounded up to the next whole minute. Homes without a published street address are measured from the Parkersburg town centre and labelled so.`,
  sourceLabel: "OSRM route data",
  sourceUrl: driveSource,
};

export const movingToParkersburg: GuideArticle = {
  slug: "moving-to-parkersburg-wv",
  seoTitle: "Moving to Parkersburg, WV: Jobs, Rent, Commute",
  description: "Moving to Parkersburg, WV: population, the largest employers, what an unfurnished rental costs and measured commutes, all from official sources.",
  h1: "Moving to Parkersburg, West Virginia",
  lede: "Starting a job in Parkersburg, or moving the family? Here is the town in numbers, from official sources: who lives here, who the large employers are, what a rental costs, and how long the drives are. Then a furnished home to live in while you find your own.",
  published: "2026-11-22",
  updated: "2026-11-22",
  towns: ["parkersburg"],
  topics: ["moving", "commuting"],
  audiences: ["relocation", "long-term"],
  homeIds: parkersburgHomes.map((home) => home.id),
  sections: [
    {
      id: "short-answer",
      heading: "Parkersburg in four numbers",
      blocks: [
        {
          kind: "list",
          items: [
            `${formatCount(city.estimate)} people live in the city of Parkersburg and ${formatCount(county.estimate)} in Wood County (Census Bureau estimate, July ${estimateYear}).`,
            `The largest employer is ${topEmployer.name}, with ${formatCount(topEmployer.employees)} employees.`,
            `HUD's Fair Market Rent for an unfurnished two-bedroom in the Parkersburg-Vienna metro is ${formatDollars(twoBedroom)} a month, utilities included (FY${fairMarketRent.fiscalYear}).`,
            `From our Parkersburg homes, Camden Clark Medical Center is ${range("camden-clark")} away and Washington Works ${range("chemours-washington-works")}.`,
          ],
        },
      ],
    },
    {
      id: "population",
      heading: "Who lives here",
      blocks: [
        { kind: "p", text: `Parkersburg is the largest city in Wood County, on the Ohio River. Vienna is a separate city on its northern edge, and Marietta, Ohio is across the river. The city's population was estimated at ${formatCount(city.estimate)} in July ${estimateYear}, ${percentChange(city.base2020, city.estimate)} since April 2020, and the county's at ${formatCount(county.estimate)} (${percentChange(county.base2020, county.estimate)}).` },
        { kind: "chart", chart: populationChart },
      ],
    },
    {
      id: "jobs",
      heading: "Where people work",
      blocks: [
        { kind: "p", text: `Healthcare, the federal government, the schools and the chemical plants at Washington Works are the largest employers. ${topEmployer.name} leads the list with ${formatCount(topEmployer.employees)} employees.` },
        { kind: "chart", chart: employerChart },
        { kind: "p", text: "Our commute guide measures the drive from every Mt Cottages home to the largest of these sites, and to Constellium in Ravenswood." },
      ],
    },
    {
      id: "housing-costs",
      heading: "What housing costs",
      blocks: [
        { kind: "p", text: `HUD's Fair Market Rent is the most consistent public yardstick for rent: ${formatDollars(twoBedroom)} a month for a two-bedroom and ${formatDollars(threeBedroom)} for a three-bedroom in the Parkersburg-Vienna metro, rent plus utilities, unfurnished. The same sizes in Washington County, Ohio are ${formatDollars(marietta.rents[2])} and ${formatDollars(marietta.rents[3])}.` },
        { kind: "chart", chart: rentChart },
        { kind: "p", text: `A furnished month costs more than a lease: our published guide is ${publishedLuxuryFurnishedRates["1 Bedroom"]} for a one-bedroom and ${publishedLuxuryFurnishedRates["3 Bedrooms"]} for a three-bedroom. For a long stay an unfurnished lease is cheaper. A furnished home is for the months before you sign one: there is no furniture to buy or move, no utilities to set up, and no year-long lease in a town you are still getting to know.` },
      ],
    },
    {
      id: "commutes",
      heading: "How long the drives are",
      blocks: [
        { kind: "p", text: "Parkersburg is compact. From our homes on Broad Street, the hospital, downtown and the high school are minutes away, and Washington Works is west of town along the river." },
        { kind: "chart", chart: commuteChart },
      ],
    },
    {
      id: "schools-healthcare",
      heading: "Schools and healthcare",
      blocks: [
        { kind: "p", text: `Public schools in Parkersburg are run by Wood County Schools. The district decides which school serves each address, so check with it before you choose a home or a lease. Parkersburg High School is ${range("parkersburg-high-school")} from our Broad Street homes.` },
        { kind: "p", text: `WVU Medicine Camden Clark Medical Center is the city's hospital, ${range("camden-clark")} from our Broad Street homes. Memorial Health System's hospitals are across the river in Marietta, Ohio.` },
      ],
    },
    {
      id: "a-move-in-steps",
      heading: "A move, in four steps",
      blocks: [
        {
          kind: "diagram",
          diagram: {
            id: "move-steps",
            title: "From a job offer to your own front door",
            steps: [
              { label: "Furnished month", detail: "Arrive with a suitcase. The home is furnished and the utilities are on." },
              { label: "Learn the town", detail: "Drive the commute at rush hour and visit the schools and neighbourhoods." },
              { label: "Find your home", detail: "Rent or buy once you know which part of town fits." },
              { label: "Move in", detail: "Stay month to month until the keys are yours, then move." },
            ],
          },
        },
        { kind: "p", text: "Stays are a month or more. How long you can stay on, and the notice to end it, are confirmed with you when you inquire." },
      ],
    },
    {
      id: "next-step",
      heading: "Next step",
      blocks: [
        { kind: "cta", heading: "Stay in a furnished home while you find yours.", text: "Send your start date and where you will be working, and we will tell you which Parkersburg home fits and whether it is free." },
      ],
    },
  ],
  sources: [
    { label: population.source.label, url: population.source.url },
    { label: fairMarketRent.source.label, url: fairMarketRent.source.url },
    { label: employers.source.label, url: employers.source.url },
    { label: "Wood County Schools", url: "https://www.woodcountyschoolswv.com/" },
    { label: "WVU Medicine Camden Clark Medical Center", url: "https://wvumedicine.org/locations/camden-clark/" },
    { label: "OSRM public router, driving profile (route data)", url: driveSource },
    { label: "OpenStreetMap copyright and licence (ODbL 1.0)", url: "https://www.openstreetmap.org/copyright" },
  ],
};
