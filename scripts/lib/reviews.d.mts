// Types for scripts/lib/reviews.mjs, so the Astro loader (src/data/reviews.ts) can
// share the validator under strict TypeScript.

export type ReviewSource = "direct" | "google";
export type ConsentChannel = "email" | "text";

/** One consented guest review, as stored in src/data/reviews.json. */
export type GuestReview = {
  id: string;
  /** A listed home id from src/data/site.ts. */
  home: string;
  firstName: string;
  /** "Town, ST": where the guest is from, never where they stayed. */
  hometown: string;
  /** The month the stay ended, YYYY-MM. */
  stayEnded: string;
  /** The guest's words, unedited. */
  text: string;
  source: ReviewSource;
  consent: { date: string; channel: ConsentChannel; record: string };
  /** The day it went on the site, YYYY-MM-DD. */
  published: string;
};

export declare const SOURCES: readonly ReviewSource[];
export declare const CONSENT_CHANNELS: readonly ConsentChannel[];
export declare function isIsoDate(value: unknown): boolean;
export declare function validateReviews(data: unknown, options?: { homeIds?: readonly string[]; today?: Date }): string[];
