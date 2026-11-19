/**
 * The content model for /guides/ (WorldEnterpriseGroup/mtcottages#47). A guide
 * is typed data: sections made of blocks (prose, lists, an inline-SVG chart or
 * diagram, a call to action, a photo). Writing a new guide is a content task:
 * add one file under src/data/guides/ and register it in index.ts; the layout,
 * schema, breadcrumbs, table of contents and related links come for free.
 *
 * Honesty rules the model enforces:
 * - The author is the Mt Cottages team, never an invented person.
 * - Every number in a chart comes from a data file (for drive times,
 *   _data/distances.json through driveMatrix()); never type figures by hand.
 * - Property photos come from the portfolio (assets/images/cottages/); any other
 *   image needs a row in docs/marketing/photo-licences.csv, which
 *   scripts/check-photo-licences.mjs enforces in CI.
 */
import type { ImageMetadata } from "astro";
import type { Audience, StayTown } from "../stay-link";

/** Guide towns: the filter on /guides/ and the homes a guide's call to action offers. */
export type GuideTown = Extract<StayTown, "marietta" | "parkersburg" | "ravenswood">;

export const guideTownLabel: Record<GuideTown, string> = {
  marietta: "Marietta, Ohio",
  parkersburg: "Parkersburg, WV",
  ravenswood: "Ravenswood, WV",
};

export type GuideTopic = "commuting" | "healthcare" | "moving" | "things-to-do" | "family";

export const guideTopicLabel: Record<GuideTopic, string> = {
  commuting: "Commuting and work",
  healthcare: "Healthcare",
  moving: "Moving to the area",
  "things-to-do": "Things to do",
  family: "Family stays",
};

/** One bar: a label, a number, the text shown beside it, and an optional note for the table. */
export type ChartBar = { label: string; value: number; valueText: string; note?: string };
export type ChartGroup = { label: string; bars: ChartBar[] };

/** A horizontal bar chart drawn as inline SVG, with the same figures as a table. One series, one hue. */
export type ChartSpec = {
  id: string;
  title: string;
  /** One line under the title: what a bar measures. */
  subtitle: string;
  /** What the value column holds, e.g. "Drive". */
  valueHeading: string;
  groups: ChartGroup[];
  /** Shown under the chart: how the numbers were measured, and their source. */
  method: string;
  sourceLabel: string;
  sourceUrl: string;
};

/** A left-to-right (stacked on phones) sequence of steps drawn as inline SVG. */
export type DiagramSpec = { id: string; title: string; steps: { label: string; detail: string }[] };

export type GuideBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "chart"; chart: ChartSpec }
  | { kind: "diagram"; diagram: DiagramSpec }
  | { kind: "cta"; heading: string; text: string }
  | { kind: "figure"; src: ImageMetadata; alt: string; caption: string };

export type GuideSection = { id: string; heading: string; blocks: GuideBlock[] };

export type GuideArticle = {
  slug: string;
  /** The <title>, without the " | Mt Cottages" suffix; with it, 60 characters or fewer. */
  seoTitle: string;
  description: string;
  h1: string;
  lede: string;
  /** ISO dates. `updated` is the last content change and feeds dateModified. */
  published: string;
  updated: string;
  towns: GuideTown[];
  topics: GuideTopic[];
  /** Living-guide audiences whose pages list this guide in their Related block. */
  audiences: Audience[];
  /** Home ids the guide is about; their microsites link back to it. */
  homeIds: string[];
  sections: GuideSection[];
  sources: { label: string; url: string }[];
};
