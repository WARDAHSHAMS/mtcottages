const { test, expect } = require("@playwright/test");

// Structured data (#22): one LodgingBusiness with a stable @id and no street
// address, an Accommodation per home that publishes a street only for the four
// approved homes, BreadcrumbList on home and town pages, and no rating, review
// or price markup anywhere. Parses the JSON-LD the way a crawler does.
const origin = "https://mtcottages.com";
const businessId = `${origin}/#business`;
const homes = [
  { name: "Frederick Cottage", base: "/marietta/frederick/", street: "125 Frederick St", locality: "Marietta", region: "OH" },
  { name: "Broad Cottage", base: "/parkersburg/broad-cottage/", street: "3113 Broad St", locality: "Parkersburg", region: "WV" },
  { name: "Buck Cottage", base: "/parkersburg/buck-cottage/", street: null, locality: "Parkersburg", region: "WV" },
  { name: "Oak Cottage", base: "/parkersburg/oak-cottage/", street: "2712 Broad St", locality: "Parkersburg", region: "WV" },
  { name: "Virginia Cottage", base: "/ravenswood/virginia-cottage/", street: null, locality: "Ravenswood", region: "WV" },
  { name: "Henrietta Cottage", base: "/ravenswood/henrietta-cottage/", street: "200 Henrietta St", locality: "Ravenswood", region: "WV" },
];
const towns = [
  { path: "/marietta/index.html", name: "Marietta, Ohio" },
  { path: "/parkersburg/index.html", name: "Parkersburg, West Virginia" },
  { path: "/ravenswood/index.html", name: "Ravenswood, West Virginia" },
];
const forbiddenKeys = ["aggregateRating", "review", "reviews", "offers", "priceRange"];

/** Every JSON-LD node on a page (blocks may hold an object or an array). */
function jsonLd(html, label) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  expect(blocks.length, `${label} has JSON-LD`).toBeGreaterThan(0);
  return blocks.flatMap((block) => {
    let parsed;
    try {
      parsed = JSON.parse(block);
    } catch (error) {
      throw new Error(`${label}: JSON-LD does not parse (${error.message})`);
    }
    return Array.isArray(parsed) ? parsed : [parsed];
  });
}

/** Every key used anywhere in a node tree. */
const keysDeep = (value) => (value && typeof value === "object" ? Object.entries(value).flatMap(([key, child]) => [key, ...keysDeep(child)]) : []);

async function nodesOf(request, path) {
  const response = await request.get(path);
  expect(response.status(), `${path} status`).toBe(200);
  return jsonLd(await response.text(), path);
}

function expectBreadcrumbs(nodes, path, names) {
  const crumbs = nodes.filter((node) => node["@type"] === "BreadcrumbList");
  expect(crumbs, `${path} has one BreadcrumbList`).toHaveLength(1);
  const items = crumbs[0].itemListElement;
  expect(items.map((item) => item.name)).toEqual(names);
  items.forEach((item, index) => {
    expect(item).toMatchObject({ "@type": "ListItem", position: index + 1 });
    expect(item.item.startsWith(`${origin}/`), `${path} crumb ${index + 1} is absolute`).toBe(true);
  });
  expect(items.at(-1).item).toBe(`${origin}${path}`);
}

test("the home page publishes the business without a street address", async ({ request }) => {
  const nodes = await nodesOf(request, "/");
  const business = nodes.filter((node) => node["@type"] === "LodgingBusiness");
  expect(business).toHaveLength(1);
  const [lodging] = business;
  expect(lodging).toMatchObject({ "@context": "https://schema.org", "@id": businessId, name: "Mt Cottages", url: `${origin}/`, email: "stay@mtcottages.com" });
  expect(lodging.image).toMatch(/^https:\/\/mtcottages\.com\/_astro\/.+\.jpg$/);
  expect(lodging.description.length).toBeGreaterThan(40);
  expect(lodging.address).toBeUndefined();
  expect(lodging.geo).toBeUndefined();
  expect(lodging.areaServed.map((place) => place.name)).toEqual(towns.map((town) => town.name));
  for (const place of lodging.areaServed) expect(place).toMatchObject({ "@type": "City", containedInPlace: { "@type": "State" } });
  expect(lodging.containsPlace.map((place) => place["@id"]).sort()).toEqual(homes.map((home) => `${origin}${home.base}#home`).sort());
});

for (const home of homes) {
  test(`${home.name} publishes an Accommodation at its approved address level`, async ({ request }) => {
    const nodes = await nodesOf(request, home.base);
    const stays = nodes.filter((node) => node["@type"] === "Accommodation");
    expect(stays).toHaveLength(1);
    const [stay] = stays;
    expect(stay).toMatchObject({ "@id": `${origin}${home.base}#home`, name: home.name, url: `${origin}${home.base}` });
    expect(Number.isInteger(stay.numberOfBedrooms) && stay.numberOfBedrooms > 0).toBe(true);
    expect(stay.description.length).toBeGreaterThan(20);
    expect(stay.address).toMatchObject({ "@type": "PostalAddress", addressLocality: home.locality, addressRegion: home.region, addressCountry: "US" });
    if (home.street) {
      expect(stay.address.streetAddress).toBe(home.street);
      expect(stay.geo["@type"]).toBe("GeoCoordinates");
    } else {
      expect(stay.address.streetAddress, `${home.name} has no public street`).toBeUndefined();
      expect(stay.address.postalCode).toBeUndefined();
      expect(stay.geo).toBeUndefined();
      expect(JSON.stringify(nodes)).not.toMatch(/\b\d{2,5}\s+[A-Z][a-z]+\s+(St|Ave|Rd|Dr|Street|Avenue)\b/);
    }
    expect(stay.amenityFeature.length).toBeGreaterThan(0);
    for (const feature of stay.amenityFeature) expect(feature).toMatchObject({ "@type": "LocationFeatureSpecification", name: expect.any(String), value: true });
    expect(stay.containedInPlace).toEqual(expect.arrayContaining([
      expect.objectContaining({ "@type": "City", name: expect.stringContaining(home.locality) }),
      { "@id": businessId },
    ]));
    expectBreadcrumbs(nodes, home.base, ["Home", expect.any(String), home.name]);
  });
}

for (const town of towns) {
  test(`${town.name} guide publishes Home / Locations / town breadcrumbs`, async ({ page, request }) => {
    const nodes = await nodesOf(request, town.path);
    expectBreadcrumbs(nodes, town.path, ["Home", "Locations", town.name]);
    // The visible trail says the same thing.
    await page.goto(town.path);
    const trail = page.locator('main nav[aria-label="Breadcrumb"]').first();
    await expect(trail).toContainText("Locations");
    await expect(trail.locator('[aria-current="page"]')).toHaveText(town.name);
  });
}

test("no page publishes rating, review or price markup, and every block parses", async ({ request }) => {
  test.setTimeout(180_000);
  const xml = await (await request.get("/sitemap.xml")).text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
  expect(paths.length).toBeGreaterThan(0);
  for (const path of paths) {
    const nodes = await nodesOf(request, path);
    const keys = new Set(keysDeep(nodes));
    for (const key of forbiddenKeys) expect(keys.has(key), `${path} publishes ${key}`).toBe(false);
    const business = nodes.filter((node) => node["@type"] === "LodgingBusiness");
    expect(business, `${path} carries the one business node`).toHaveLength(1);
    expect(business[0]["@id"]).toBe(businessId);
  }
});
