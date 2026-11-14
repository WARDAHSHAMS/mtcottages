import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Home microsites: the shared Mt Cottages template renders these (src/pages/[town]/[home]).
// Their index pages are directory URLs; every other page is a .html file. Keep this list in step with
// `homes` in src/data/homes/index.ts: scripts/check-dist.mjs fails the build when a microsite is missing
// from the sitemap or the sitemap lists a redirect.
const micrositeRoots = [
  "/marietta/frederick", "/ravenswood/henrietta-cottage", "/ravenswood/virginia-cottage",
  "/parkersburg/oak-cottage", "/parkersburg/broad-cottage", "/parkersburg/buck-cottage",
];
// Older summary slugs (`legacySlugs` in the home data) that redirect to a microsite.
const legacySummaryPages = ["/parkersburg/buck-apartment-1"];

// Frederick's old hand-built pages, now redirects emitted from `legacyPages` in
// src/data/homes/frederick.ts. Keep this list in step with that map so the
// redirects stay out of the sitemap (check-dist.mjs and homes.spec.js check both).
const frederickBase = "/marietta/frederick";
const frederickLegacyPages = ["rooms", "kitchen", "bathrooms", "living", "outdoors", "gallery", "area", "arrival", "utilities", "handbook"];

// The 23 section pages of the old bespoke Broad Cottage site now land on the closest new page.
const broadBase = "/parkersburg/broad-cottage";
const broadSectionTargets = {
  gallery: "tour.html",
  "virtual-tour": "plan.html",
  "floor-plan": "plan.html",
  kitchen: "tour.html",
  "living-room": "tour.html",
  bedroom: "tour.html",
  bathroom: "tour.html",
  laundry: "tour.html",
  outdoors: "tour.html",
  amenities: "amenities.html",
  connectivity: "amenities.html",
  workspace: "amenities.html",
  accessibility: "amenities.html",
  parking: "amenities.html",
  policies: "amenities.html",
  neighborhood: "location.html",
  map: "location.html",
  healthcare: "location.html",
  dining: "location.html",
  recreation: "location.html",
  shopping: "location.html",
  transportation: "location.html",
  availability: "",
};
// Under build.format "preserve" a redirect from ".../<section>/index" is written to ".../<section>/index.html",
// which keeps the old directory URLs working. The old summary pages (/parkersburg/broad-cottage.html,
// oak-cottage.html, henrietta-cottage.html) are emitted by src/pages/[town]/[home].html.ts.
const redirects = Object.fromEntries(
  Object.entries(broadSectionTargets).map(([section, target]) => [`${broadBase}/${section}/index`, `${broadBase}/${target}`]),
);

const isMicrositeRedirect = (pathname) => {
  const clean = pathname.replace(/\/+$/, "");
  if ([...micrositeRoots, ...legacySummaryPages].some((root) => clean === `${root}.html`)) return true;
  if (frederickLegacyPages.some((page) => clean === `${frederickBase}/${page}` || clean === `${frederickBase}/${page}.html`)) return true;
  return Object.keys(broadSectionTargets).some((section) => clean === `${broadBase}/${section}` || clean === `${broadBase}/${section}/index.html`);
};

const shouldIncludeInSitemap = (page) => {
  const pathname = new URL(page).pathname;
  return !isMicrositeRedirect(pathname);
};

export default defineConfig({
  site: "https://mtcottages.com",
  output: "static",
  compressHTML: true,
  // Outside node_modules so `npm ci` keeps it: CI caches this folder, and the
  // optimised images in it save re-encoding every photo on each build.
  cacheDir: "./.cache/astro",
  build: {
    format: "preserve",
    assets: "_astro"
  },
  redirects,
  image: {
    responsiveStyles: true,
    service: { entrypoint: "astro/assets/services/sharp" }
  },
  integrations: [sitemap({
    filter: (page) => shouldIncludeInSitemap(page) && !["/404", "/resident-portal", "/pay-rent", "/maintenance", "/emergency-maintenance"].some((route) => page.endsWith(route)),
    serialize(item) {
      const url = new URL(item.url);
      // Microsite index pages are directory URLs.
      const root = micrositeRoots.find((candidate) => url.pathname.replace(/\/+$/, "") === candidate);
      if (root) {
        url.pathname = `${root}/`;
        return { ...item, url: url.toString() };
      }
      const locationGuides = new Set(["/grantsville", "/marietta", "/parkersburg", "/racine", "/ravenswood"]);
      if (url.pathname !== "/") {
        url.pathname = locationGuides.has(url.pathname) ? `${url.pathname}/index.html` : url.pathname.endsWith("/") ? `${url.pathname}index.html` : `${url.pathname}.html`;
      }
      return { ...item, url: url.toString() };
    }
  })]
});
