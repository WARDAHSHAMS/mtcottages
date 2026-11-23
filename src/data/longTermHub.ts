/**
 * The long-term furnished living hub (#46): /stays/long-term/ for persona P7,
 * who compares a furnished month with an unfurnished lease. It is written
 * in the guide content model (src/data/guides/types.ts), so it shares the
 * guide layout, chart, sources list and honesty rules, but it lives at its
 * own audience URL and is not listed among the area guides.
 *
 * Every figure is read from a data file, never typed: HUD Fair Market Rents
 * from _data/area-stats.json (scripts/area-stats.mjs), our furnished guide
 * rates from src/data/site.ts. The one national figure (BLS household
 * furnishings spending) is kept below with its release and date. The page
 * says plainly that a lease costs less each month.
 */
import { homes } from "./homes";
import { publishedLuxuryFurnishedRates } from "./site";
import { areaStats, formatDollars, rentArea } from "./areaStats";
import { validateArticles, type ChartGroup, type GuideArticle } from "./guides";

export const hubHref = "/stays/long-term/";
export const hubAudience = "long-term" as const;

/** The day the BLS release was read for this page. */
const checked = "2026-11-22";

/**
 * BLS Consumer Expenditures, 2025 (USDL-26-1619, released October 29, 2026):
 * average annual spending per consumer unit on household furnishings and
 * equipment. A national average, quoted as context, never added to a bar.
 */
export const furnishingsSpending = {
  year: 2025,
  annual: 2355,
  label: "BLS Consumer Expenditures, 2025 (news release USDL-26-1619)",
  url: "https://www.bls.gov/news.release/cesan.nr0.htm",
} as const;

const { fairMarketRent } = areaStats;
const fy = fairMarketRent.fiscalYear;
const parkersburg = rentArea("parkersburg-vienna");
const washington = rentArea("washington-county-oh");

/** "$1,895/month" from src/data/site.ts, as a number. */
function monthlyRate(label: keyof typeof publishedLuxuryFurnishedRates): number {
  const match = /^\$([\d,]+)\/month$/.exec(publishedLuxuryFurnishedRates[label]);
  if (!match) throw new Error(`longTermHub: publishedLuxuryFurnishedRates["${label}"] is "${publishedLuxuryFurnishedRates[label]}", not "$N/month"`);
  return Number(match[1].replace(/,/g, ""));
}

/** Bedroom sizes with a furnished guide rate, and the matching index in HUD's rents (0 = studio). */
const SIZES = [
  { label: "1 Bedroom", heading: "One bedroom", rentIndex: 1 },
  { label: "2 Bedrooms", heading: "Two bedrooms", rentIndex: 2 },
  { label: "3 Bedrooms", heading: "Three bedrooms", rentIndex: 3 },
] as const;

export const costRows = SIZES.map((size) => ({
  heading: size.heading,
  furnished: monthlyRate(size.label),
  parkersburg: parkersburg.rents[size.rentIndex],
  washington: washington.rents[size.rentIndex],
}));

const groups: ChartGroup[] = costRows.map((row) => ({
  label: row.heading,
  bars: [
    { label: "Unfurnished lease, Parkersburg-Vienna", value: row.parkersburg, valueText: formatDollars(row.parkersburg), note: `HUD Fair Market Rent FY${fy}, rent plus utilities` },
    { label: "Unfurnished lease, Washington County, Ohio", value: row.washington, valueText: formatDollars(row.washington), note: `HUD Fair Market Rent FY${fy}, rent plus utilities` },
    { label: "Mt Cottages furnished month", value: row.furnished, valueText: formatDollars(row.furnished), note: "Published guide rate, utilities included; confirm the rate for a home on inquiry" },
  ],
}));

const one = costRows[0];
const oneGap = one.furnished - one.parkersburg;
const furnishingsMonthly = Math.round(furnishingsSpending.annual / 12);

export const longTermHub: GuideArticle = {
  slug: "long-term-furnished-stays",
  seoTitle: "Long-Term Furnished Rentals: The True Cost",
  description: `A furnished month near Parkersburg, WV and Marietta, Ohio against an unfurnished lease: HUD FY${fy} rents, what each price includes, and when a lease is cheaper.`,
  h1: "Long-term furnished stays, and what they really cost",
  lede: "A furnished home for a month or a season in the Mid-Ohio Valley costs more each month than an unfurnished lease. Here is how much more, from public figures, what the difference pays for, and when a lease is the better choice.",
  published: checked,
  updated: checked,
  towns: ["marietta", "parkersburg", "ravenswood"],
  topics: ["moving"],
  audiences: [hubAudience],
  homeIds: homes.map((home) => home.id),
  sections: [
    {
      id: "monthly-cost",
      heading: "A furnished month against an unfurnished lease",
      blocks: [
        {
          kind: "p",
          text: `HUD's Fair Market Rent is the public yardstick for what an ordinary unfurnished rental costs: rent plus the utilities a tenant pays, for a standard-quality home. For FY${fy} it is ${formatDollars(one.parkersburg)} a month for a one-bedroom in the Parkersburg-Vienna metro and ${formatDollars(one.washington)} in Washington County, Ohio. Our published guide for a furnished one-bedroom is ${formatDollars(one.furnished)} a month, utilities included.`,
        },
        {
          kind: "chart",
          chart: {
            id: "true-monthly-cost",
            title: `Monthly cost by size, FY${fy}`,
            subtitle: "Unfurnished lease (rent plus utilities) against a Mt Cottages furnished month",
            valueHeading: "Per month",
            groups,
            method: `Leases: HUD's FY${fy} Fair Market Rents, the 40th-percentile gross rent (rent plus tenant-paid utilities) of a standard-quality unfurnished home, for the Parkersburg-Vienna metro and Washington County, Ohio. Furnished: the published Mt Cottages guide rate for the bedroom count; each home's own rate is confirmed on inquiry.`,
            sourceLabel: fairMarketRent.source.label,
            sourceUrl: fairMarketRent.source.url,
          },
        },
      ],
    },
    {
      id: "what-it-includes",
      heading: "What each price includes",
      blocks: [
        {
          kind: "list",
          items: [
            "A Mt Cottages month: the furniture, a full kitchen and the utilities, in one monthly rate, and fiber-optic internet in every home. Stays start at 30 nights, with no year-long lease.",
            `An unfurnished lease at the Fair Market Rent: rent and utilities. You bring or buy the furniture and kitchen, set up the utility accounts and internet, and sign for the lease's term. For scale, the average American household spent ${formatDollars(furnishingsSpending.annual)} on household furnishings and equipment in ${furnishingsSpending.year} (about ${formatDollars(furnishingsMonthly)} a month), and that is spending by households that already have a home.`,
            "Deposits: a landlord sets the deposit on a lease. Ours is confirmed on inquiry for each home.",
          ],
        },
      ],
    },
    {
      id: "when-a-lease-is-cheaper",
      heading: "When a lease is the better choice",
      blocks: [
        {
          kind: "p",
          text: `For a one-bedroom, a furnished month costs about ${formatDollars(oneGap)} more than the Parkersburg-Vienna Fair Market Rent. If you already own furniture and you will stay a year or more, an unfurnished lease is cheaper, and we would rather tell you so.`,
        },
        {
          kind: "p",
          text: "A furnished month is the better choice when the stay has an end date or an unknown one: the first months of a new job while you look for a place to buy or rent, a contract of a few months, a house that is being built, repaired or sold, or time near family. Then the difference pays for not buying or moving furniture, not setting up accounts, and not signing for a year in a town you are still getting to know.",
        },
        { kind: "cta", heading: "Tell us how long you need a home.", text: "Send your dates, the town you need, and who is coming, and we will confirm which home is free and its monthly rate." },
      ],
    },
  ],
  sources: [
    { label: `${fairMarketRent.source.label}: Fair Market Rents (read ${checked})`, url: fairMarketRent.source.url },
    { label: `${fairMarketRent.source.label}: the data file`, url: fairMarketRent.source.file ?? fairMarketRent.source.url },
    { label: `${furnishingsSpending.label} (read ${checked})`, url: furnishingsSpending.url },
  ],
};

const problems = validateArticles([longTermHub]);
if (problems.length > 0) throw new Error(`src/data/longTermHub.ts is invalid:\n${problems.join("\n")}`);
