const { test, expect } = require("@playwright/test");

// Guest reviews (#61): a home shows a reviews section only when it has a
// consented review, never a placeholder, and its Review markup matches the
// reviews on the page word for word, with no rating anywhere.
const origin = "https://mtcottages.com";
const homes = [
  "/marietta/frederick/",
  "/parkersburg/broad-cottage/",
  "/parkersburg/buck-cottage/",
  "/parkersburg/oak-cottage/",
  "/ravenswood/virginia-cottage/",
  "/ravenswood/henrietta-cottage/",
];

async function reviewNodes(page) {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((text) => [JSON.parse(text)].flat()).filter((node) => node["@type"] === "Review");
}

for (const base of homes) {
  test(`${base} shows exactly the reviews its markup publishes, and nothing when there are none`, async ({ page }) => {
    await page.goto(base);
    const shown = page.locator("[data-guest-review]");
    const texts = await shown.locator("blockquote p").allTextContents();
    const nodes = await reviewNodes(page);
    expect(nodes.map((node) => node.reviewBody)).toEqual(texts);
    for (const node of nodes) {
      expect(node.itemReviewed).toEqual({ "@id": `${origin}${base}#home` });
      expect(node.author["@type"]).toBe("Person");
      expect(node.reviewRating).toBeUndefined();
    }
    if (texts.length === 0) {
      await expect(page.locator("[data-guest-reviews]")).toHaveCount(0);
      await expect(page.locator("main")).not.toContainText(/guest reviews?|testimonial|be the first to review/i);
    } else {
      await expect(page.locator("[data-guest-reviews] h2")).toBeVisible();
      await expect(page.locator("[data-guest-reviews]")).toContainText("written permission");
    }
  });
}
