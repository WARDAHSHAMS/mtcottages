// Types for scripts/lib/distances.mjs, so the Astro loader (src/data/distances.ts)
// can share the CI validator under strict TypeScript.

export declare const APPROVED_ADDRESSES: readonly string[];
export declare const CATEGORIES: readonly ("hospital" | "employer" | "campus" | "school" | "grocery" | "attraction" | "highway")[];
export declare const ORIGIN_KINDS: readonly ("address" | "town-centre")[];
export declare const MAX_AGE_DAYS: number;
export declare const METERS_PER_MILE: number;
export declare const MAX_LABEL_LENGTH: number;

export declare const MEASUREMENT_TIME_ZONE: "America/New_York";

export declare function calendarDate(instant: Date): string;
export declare function minutesFor(seconds: number): number;
export declare function milesFor(meters: number): number;
export declare function ageInDays(measured: unknown, today: Date): number | null;
export declare function isStale(measured: unknown, today: Date): boolean;
export declare function validateDistances(data: unknown, options?: { today?: Date }): string[];
