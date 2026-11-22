import type { ReviewLeaf, WithContext } from "schema-dts";
import raw from "./reviews.json";
import { validateReviews, type GuestReview } from "../../scripts/lib/reviews.mjs";
import { cottages } from "./site";

/**
 * Consented guest reviews (WorldEnterpriseGroup/mtcottages#61), read from
 * src/data/reviews.json. The list is empty until a guest gives written consent;
 * with no review a home shows no reviews section and publishes no Review
 * markup, so nothing on the site ever stands in for a real review. How reviews
 * are asked for and added: docs/marketing/reviews.md.
 */

const problems = validateReviews(raw, { homeIds: cottages.map((cottage) => cottage.id) });
if (problems.length > 0) {
  throw new Error(`src/data/reviews.json is invalid:\n${problems.join("\n")}`);
}

// validateReviews has just checked every entry, so the narrower type holds.
const allReviews = (raw as unknown as { reviews: GuestReview[] }).reviews;

/** A home's reviews, newest first. */
export function reviewsFor(homeId: string): GuestReview[] {
  return allReviews.filter((review) => review.home === homeId).sort((a, b) => b.published.localeCompare(a.published));
}

/** "October 2026" from YYYY-MM, in UTC so the build machine's zone never shifts it. */
export const formatMonth = (month: string): string =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * One schema.org Review per review the page shows, word for word. There is no
 * rating and no aggregateRating: guests are not asked for stars, and the
 * business does not rate itself.
 */
export function reviewSchemaFor(homeId: string, homeUrl: string, homeNode: string): WithContext<ReviewLeaf>[] {
  return reviewsFor(homeId).map((review) => ({
    "@context": "https://schema.org",
    "@type": "Review",
    "@id": `${homeUrl}#review-${review.id}`,
    itemReviewed: { "@id": homeNode },
    author: { "@type": "Person", name: review.firstName },
    reviewBody: review.text,
    datePublished: review.published,
    inLanguage: "en-US",
  }));
}
