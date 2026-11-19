// Unit tests for integrations/page-lastmod.mjs (WorldEnterpriseGroup/mtcottages#82):
// each sitemap lastmod is the date its own content last changed, the same on every
// build of the same commit, and an edit to one home moves only that home's pages.
// Runs against a throwaway git repository with fixed commit dates; nothing is built.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { PageLastmod } from "../../integrations/page-lastmod.mjs";

const quiet = { warnings: [], warn(message) { this.warnings.push(message); }, info() {} };

function makeSite() {
  const root = mkdtempSync(path.join(tmpdir(), "page-lastmod-"));
  const write = (file, text) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  };
  const git = (args, date) =>
    execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.invalid",
        GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.invalid",
        ...(date ? { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : {}),
      },
    });
  const commit = (message, date) => {
    git(["add", "-A"]);
    git(["commit", "-q", "-m", message], date);
  };
  const home = (id, slug, town, photo) => `import type { HomeMicrosite } from "./types";
import { rates } from "../site";
import hero from "../../../assets/images/cottages/${photo}";

export const ${id}Home: HomeMicrosite = {
  id: "${id}",
  slug: "${slug}",
  town: { name: "Town", state: "WV", slug: "${town}" },
  hero,
  rate: rates.two,
};
`;
  const distances = (aMinutes, bMinutes) => JSON.stringify({
    microsites: { alpha: "alpha", beta: "beta-centre" },
    origins: { alpha: { label: "Alpha" }, "beta-centre": { label: "Beta town centre" } },
    destinations: { hospital: { name: "Hospital" }, park: { name: "Park" } },
    rows: [
      { id: "alpha:hospital", origin: "alpha", destination: "hospital", minutes: aMinutes, source: "osrm" },
      { id: "beta-centre:park", origin: "beta-centre", destination: "park", minutes: bMinutes, source: "osrm" },
    ],
    sources: { osrm: { name: "OSRM" } },
  }, null, 2);

  git(["init", "-q", "-b", "main"]);
  write("src/pages/[town]/[home]/index.astro", "---\nimport HomeLayout from \"../../../layouts/HomeLayout.astro\";\n---\n");
  write("src/pages/[town]/[home]/[page].astro", "---\n---\n");
  write("src/pages/[...slug].astro", "---\nimport { guides } from \"../data/site\";\n---\n");
  write("src/pages/about.astro", "---\nimport Layout from \"../layouts/SiteLayout.astro\";\nimport { rows } from \"../data/distances\";\n---\n");
  write("src/layouts/SiteLayout.astro", "<slot />\n");
  write("src/layouts/HomeLayout.astro", "<slot />\n");
  write("src/data/site.ts", "export const rates = { two: \"$1\" };\nexport const guides = {};\n");
  write("src/data/distances.ts", "import raw from \"../../_data/distances.json\";\nexport const rows = raw.rows;\n");
  write("src/data/homes/types.ts", "export type HomeMicrosite = Record<string, unknown>;\n");
  write("src/data/homes/alpha.ts", home("alpha", "alpha-cottage", "northtown", "north-01/hero.jpg"));
  write("src/data/homes/beta.ts", home("beta", "beta-cottage", "southtown", "south-01/hero.jpg"));
  write("assets/images/cottages/north-01/hero.jpg", "alpha photo v1");
  write("assets/images/cottages/south-01/hero.jpg", "beta photo v1");
  write("_data/distances.json", distances(5, 9));
  commit("site", "2026-01-01T10:00:00Z");
  return { root, write, commit, distances, git };
}

const alphaPages = ["/northtown/alpha-cottage/", "/northtown/alpha-cottage/tour.html", "/northtown/alpha-cottage/location.html"];
const betaPages = ["/southtown/beta-cottage/", "/southtown/beta-cottage/amenities.html"];
const otherPages = ["/about.html", "/guides.html"];
const all = [...alphaPages, ...betaPages, ...otherPages];
const datesOf = (root) => {
  const dates = new PageLastmod({ root, logger: quiet });
  return Object.fromEntries(all.map((page) => [page, dates.lastmod(page)]));
};

describe("per-page lastmod", () => {
  let site;
  before(() => {
    site = makeSite();
  });
  after(() => rmSync(site.root, { recursive: true, force: true }));

  test("every page starts at the commit that created it, and two builds agree", () => {
    const first = datesOf(site.root);
    const second = datesOf(site.root);
    assert.deepEqual(second, first, "same commit, same dates");
    for (const page of all) assert.equal(first[page], "2026-01-01T10:00:00Z", page);
  });

  test("editing one home's data moves only that home's pages", () => {
    site.write("src/data/homes/alpha.ts", site.git(["show", "HEAD:src/data/homes/alpha.ts"]).replace("rates.two", "rates.two + \"\""));
    site.commit("alpha data", "2026-02-01T10:00:00Z");
    const dates = datesOf(site.root);
    for (const page of alphaPages) assert.equal(dates[page], "2026-02-01T10:00:00Z", page);
    for (const page of [...betaPages, ...otherPages]) assert.equal(dates[page], "2026-01-01T10:00:00Z", page);
  });

  test("a new photo for one home moves only that home's pages", () => {
    site.write("assets/images/cottages/south-01/hero.jpg", "beta photo v2");
    site.commit("beta photo", "2026-03-01T10:00:00Z");
    const dates = datesOf(site.root);
    for (const page of betaPages) assert.equal(dates[page], "2026-03-01T10:00:00Z", page);
    for (const page of alphaPages) assert.equal(dates[page], "2026-02-01T10:00:00Z", page);
  });

  test("a distance row moves only its home, though every home shares the file", () => {
    site.write("_data/distances.json", site.distances(6, 9));
    site.commit("alpha drive time", "2026-04-01T10:00:00Z");
    let dates = datesOf(site.root);
    for (const page of alphaPages) assert.equal(dates[page], "2026-04-01T10:00:00Z", page);
    for (const page of betaPages) assert.equal(dates[page], "2026-03-01T10:00:00Z", page);
    // A page that imports the whole table moves with any row.
    assert.equal(dates["/about.html"], "2026-04-01T10:00:00Z");

    site.write("_data/distances.json", site.distances(6, 10));
    site.commit("beta drive time", "2026-05-01T10:00:00Z");
    dates = datesOf(site.root);
    for (const page of alphaPages) assert.equal(dates[page], "2026-04-01T10:00:00Z", page);
    for (const page of betaPages) assert.equal(dates[page], "2026-05-01T10:00:00Z", page);
  });

  test("layout and type-only changes are chrome, not content", () => {
    site.write("src/layouts/SiteLayout.astro", "<main><slot /></main>\n");
    site.write("src/layouts/HomeLayout.astro", "<main><slot /></main>\n");
    site.write("src/data/homes/types.ts", "export type HomeMicrosite = Record<string, string>;\n");
    site.commit("chrome", "2026-06-01T10:00:00Z");
    const dates = datesOf(site.root);
    for (const page of all) assert.notEqual(dates[page], "2026-06-01T10:00:00Z", page);
  });

  test("a home template edit moves every home's pages of that template", () => {
    site.write("src/pages/[town]/[home]/[page].astro", "---\n// tour copy\n---\n");
    site.commit("template", "2026-07-01T10:00:00Z");
    const dates = datesOf(site.root);
    assert.equal(dates["/northtown/alpha-cottage/tour.html"], "2026-07-01T10:00:00Z");
    assert.equal(dates["/southtown/beta-cottage/amenities.html"], "2026-07-01T10:00:00Z");
    assert.equal(dates["/northtown/alpha-cottage/"], "2026-04-01T10:00:00Z", "index uses its own template");
  });

  test("dates are UTC whatever the committer's zone", () => {
    site.write("src/pages/about.astro", "---\nimport { rows } from \"../data/distances\";\n// copy edit\n---\n");
    site.commit("about copy", "2026-08-01T12:00:00+02:00");
    assert.equal(datesOf(site.root)["/about.html"], "2026-08-01T10:00:00Z");
  });

  test("a page with no committed source falls back to HEAD and says so", () => {
    const logger = { warnings: [], warn(message) { this.warnings.push(message); }, info() {} };
    rmSync(path.join(site.root, "src/pages/[...slug].astro"));
    const dates = new PageLastmod({ root: site.root, logger });
    assert.equal(dates.lastmod("/nowhere.html"), "2026-08-01T10:00:00Z");
    assert.deepEqual(dates.fallbacks, ["/nowhere.html"]);
    assert.match(logger.warnings.join("\n"), /\/nowhere\.html: no committed source/);
  });

  test("a shallow clone fails when asked to (CI) and warns otherwise", () => {
    const shallow = mkdtempSync(path.join(tmpdir(), "page-lastmod-shallow-"));
    try {
      execFileSync("git", ["clone", "-q", "--depth", "1", `file://${site.root}`, shallow]);
      assert.throws(() => new PageLastmod({ root: shallow, logger: quiet, failOnShallow: true }), /shallow/);
      const logger = { warnings: [], warn(message) { this.warnings.push(message); }, info() {} };
      new PageLastmod({ root: shallow, logger });
      assert.match(logger.warnings.join("\n"), /shallow/);
    } finally {
      rmSync(shallow, { recursive: true, force: true });
    }
  });
});

describe("area guide lastmod (#47)", () => {
  let site;
  const guideDates = (root) => {
    const dates = new PageLastmod({ root, logger: quiet });
    return { one: dates.lastmod("/guides/guide-one/"), two: dates.lastmod("/guides/guide-two/index.html"), fallbacks: dates.fallbacks };
  };
  before(() => {
    site = makeSite();
    site.write("src/pages/guides/[slug]/index.astro", "---\nimport { articles } from \"../../../data/guides\";\n---\n");
    site.write("src/data/guides/one.ts", "import { rows } from \"../distances\";\nexport const one = { slug: \"guide-one\", rows };\n");
    site.write("src/data/guides/two.ts", "export const two = { slug: \"guide-two\", text: \"v1\" };\n");
    site.commit("guides", "2026-09-01T10:00:00Z");
  });
  after(() => rmSync(site.root, { recursive: true, force: true }));

  test("a guide page is dated by its own article module, not the catch-all", () => {
    const dates = guideDates(site.root);
    assert.equal(dates.one, "2026-09-01T10:00:00Z");
    assert.equal(dates.two, "2026-09-01T10:00:00Z");
    assert.deepEqual(dates.fallbacks, []);
  });

  test("editing one guide moves only that guide", () => {
    site.write("src/data/guides/two.ts", "export const two = { slug: \"guide-two\", text: \"v2\" };\n");
    site.commit("guide two copy", "2026-10-01T10:00:00Z");
    const dates = guideDates(site.root);
    assert.equal(dates.two, "2026-10-01T10:00:00Z");
    assert.equal(dates.one, "2026-09-01T10:00:00Z");
  });

  test("a guide that quotes drive times moves with the distances table", () => {
    site.write("_data/distances.json", site.distances(7, 11));
    site.commit("re-measure", "2026-10-15T10:00:00Z");
    const dates = guideDates(site.root);
    assert.equal(dates.one, "2026-10-15T10:00:00Z");
    assert.equal(dates.two, "2026-10-01T10:00:00Z");
  });
});
