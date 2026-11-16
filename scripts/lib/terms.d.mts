// Types for scripts/lib/terms.mjs, so the Astro loader (src/data/terms.ts) can
// share the validator under strict TypeScript.

export type TermField = "monthlyRate" | "deposit" | "minimumStay" | "utilities" | "pets" | "availableFrom";
export type TermStatus = "confirmed" | "listed" | "guide" | "confirm";

export declare const TERM_FIELDS: readonly TermField[];
export declare const ALLOWED_STATUSES: Readonly<Record<TermField, readonly TermStatus[]>>;
export declare const VALUE_KIND: Readonly<Record<TermField, "dollars" | "date" | "text">>;

export declare function isIsoDate(value: unknown): boolean;
export declare function decisionIds(markdown: string): Set<string>;
export declare function validateTerms(data: unknown, options?: { homeIds?: readonly string[]; decisions?: Set<string> }): string[];
