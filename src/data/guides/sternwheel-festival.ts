/**
 * Seasonal guide (#52): the Ohio River Sternwheel Festival in Marietta, Ohio.
 * Targets "marietta ohio sternwheel festival", which peaks in August and
 * September, so the page is published well before the peak.
 *
 * Every festival fact comes from the organiser's own site (sternwheel.org),
 * read on the date in `checked` below, and the page says which year those
 * facts apply to. Dates for a year the organiser has not announced are given
 * only as the festival's own rule (the weekend after Labor Day), worked out
 * here, and labelled "confirm on sternwheel.org". The drive from Frederick
 * Cottage comes from _data/distances.json through driveMatrix(), never typed.
 *
 * Stays are 30 nights or more (owner decision on #68, D3 in
 * docs/marketing/brand-and-positioning.md), so the call to action is a
 * month in Marietta, never a festival-weekend booking.
 */
import { homes } from "../homes";
import { driveMatrix, formatMeasured } from "../distances";
import type { GuideArticle } from "./types";

/** The day the organiser's pages were read for this guide. */
const checked = "2026-11-20";
/** The festival year the organiser's published details describe. */
const listedYear = 2026;

/** The Friday and Sunday after Labor Day (the first Monday in September): the organiser's stated rule. */
export function festivalWeekend(year: number): { friday: Date; sunday: Date } {
  const septemberFirst = new Date(Date.UTC(year, 8, 1));
  const laborDay = 1 + ((8 - septemberFirst.getUTCDay()) % 7);
  return { friday: new Date(Date.UTC(year, 8, laborDay + 4)), sunday: new Date(Date.UTC(year, 8, laborDay + 6)) };
}

const weekendText = (year: number) => {
  const { friday, sunday } = festivalWeekend(year);
  return `Friday to Sunday, September ${friday.getUTCDate()} to ${sunday.getUTCDate()}, ${year}`;
};

// The rule must reproduce the dates the organiser published, or the projection below is wrong.
{
  const { friday, sunday } = festivalWeekend(listedYear);
  if (friday.getUTCDate() !== 11 || sunday.getUTCDate() !== 13) {
    throw new Error(`sternwheel-festival: the after-Labor-Day rule gives ${weekendText(listedYear)}, not the published September 11 to 13, ${listedYear}`);
  }
}

const nextYear = listedYear + 1;
const frederick = homes.find((home) => home.id === "frederick");
if (!frederick) throw new Error("sternwheel-festival: no Frederick Cottage in src/data/homes");
const drive = driveMatrix(["downtown-marietta"], [frederick])[0]?.drives.find((candidate) => candidate.homeId === "frederick");
if (!drive) throw new Error("sternwheel-festival: no measured drive from Frederick Cottage to downtown Marietta");

export const sternwheelFestival: GuideArticle = {
  slug: "marietta-ohio-sternwheel-festival",
  seoTitle: "Marietta, Ohio Sternwheel Festival Guide",
  description: `The Ohio River Sternwheel Festival in Marietta, Ohio: the ${listedYear} dates, the ${nextYear} weekend to expect, fireworks, parking, the free trolley and how to check.`,
  h1: "The Ohio River Sternwheel Festival in Marietta, Ohio",
  lede: "Every September, paddle-wheel boats tie up along the Ohio River levee in Marietta, Ohio, for a free weekend of music, boats and fireworks where the Muskingum meets the Ohio. Here is what the organiser publishes about the dates, parking and fireworks, and how to check it before you go.",
  published: checked,
  updated: checked,
  towns: ["marietta"],
  topics: ["things-to-do"],
  audiences: ["long-term", "visitor"],
  homeIds: ["frederick"],
  sections: [
    {
      id: "dates",
      heading: "When the festival is",
      blocks: [
        {
          kind: "list",
          items: [
            "The rule: the festival is always the weekend after Labor Day, Friday to Sunday, on the Ohio River levee in Marietta, Ohio.",
            `${listedYear}: ${weekendText(listedYear)}, the 50th annual festival, as the organiser lists it.`,
            `${nextYear}: not yet announced when we checked on ${formatMeasured(checked)}. By the rule it would be ${weekendText(nextYear)}. Confirm on sternwheel.org before you plan around it.`,
          ],
        },
        { kind: "p", text: `The details on this page are the ones the organiser published for ${listedYear}. Times, prices and the shuttle can change from year to year, so check sternwheel.org, the festival's own site (linked under Sources), for the year you are coming.` },
      ],
    },
    {
      id: "what-it-is",
      heading: "What happens on the levee",
      blocks: [
        { kind: "p", text: "Admission is free. The organiser describes crowds of up to 100,000 people over the weekend, along the levee in downtown Marietta where the Muskingum River joins the Ohio." },
        { kind: "p", text: `Live music runs on all three nights; in ${listedYear} each of Friday, Saturday and Sunday had an evening headliner. The weekend also has an art stroll, a car show, a 5K, a photo contest and a worship service, each listed with its own times on sternwheel.org.` },
      ],
    },
    {
      id: "fireworks",
      heading: "Fireworks",
      blocks: [
        { kind: "p", text: `In ${listedYear} the fireworks were on Saturday night at 9:30 PM, launched from barges anchored on the Ohio River and set to music broadcast on 99 WXIL. The organiser posts the night and time on its fireworks page each year.` },
        { kind: "p", text: "The organiser does not name official viewing spots. The levee is the festival ground and it fills up on Saturday evening, so bring a chair or a blanket and arrive in daylight if you want a place near the water." },
      ],
    },
    {
      id: "parking",
      heading: "Parking and the free trolley",
      blocks: [
        {
          kind: "list",
          items: [
            "Free parking at the Washington County Fairgrounds on Front Street.",
            `Festival lots on Second Street between Butler and Greene Streets, with more spaces on Greene between Third and Second. In ${listedYear} they cost $5 on Friday and $10 on Saturday.`,
            `A free trolley ran on Friday from 6 PM to 11 PM and on Saturday from 10 AM to midnight in ${listedYear}, stopping at the Fairgrounds, the Valley Gem landing and the Armory, all on Front Street, about every 30 minutes. Donations are welcome.`,
            "The trolley is not wheelchair accessible. Accessible parking is marked on the organiser's festival map.",
          ],
        },
      ],
    },
    {
      id: "staying",
      heading: "Making it a month in Marietta",
      blocks: [
        { kind: "p", text: "Mt Cottages homes are furnished stays of 30 nights or more, so we do not offer festival-weekend bookings. If you are moving to the valley, starting a contract or spending a season near family, a month that takes in the second week of September puts the festival on your calendar." },
        { kind: "p", text: `Frederick Cottage is our home in Marietta, Ohio, about ${drive.minutes} minutes by car (${drive.miles} miles, measured ${formatMeasured(drive.measured)}) from the courthouse in downtown Marietta. On festival nights, the free Fairgrounds parking and the trolley are the easy way down to the levee.` },
        { kind: "cta", heading: "Spend September in Marietta.", text: "Send your dates and what brings you to the valley, and we will confirm whether Frederick Cottage is free for a month that includes the festival." },
      ],
    },
  ],
  sources: [
    { label: `Ohio River Sternwheel Festival, official site: dates and admission (read ${formatMeasured(checked)})`, url: "https://sternwheel.org/" },
    { label: `Ohio River Sternwheel Festival: transportation, parking and trolley (read ${formatMeasured(checked)})`, url: "https://sternwheel.org/about/transportation/" },
    { label: `Ohio River Sternwheel Festival: fireworks (read ${formatMeasured(checked)})`, url: "https://sternwheel.org/fireworks/" },
    { label: "OSRM public router, driving profile (route data)", url: drive.sourceUrl },
  ],
};
