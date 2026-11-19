// Unit tests for the internal-linking gate (WorldEnterpriseGroup/mtcottages#35).
// Run: node --test scripts/tests/*.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  analyseSite,
  anchorNameProblem,
  breadcrumbProblems,
  extractAnchors,
  internalPath,
  pagePathOf,
  resolveTarget,
  visibleCrumbs,
} from "../lib/links.mjs";

const crumbsNav = (items) =>
  `<nav class="crumbs" aria-label="Breadcrumb">${items
    .map(([name, href], index) => (index < items.length - 1 ? `<a href="${href}">${name}</a><span aria-hidden="true">/</span>` : `<span aria-current="page">${name}</span>`))
    .join("")}</nav>`;
const crumbsSchema = (items) =>
  `<script type="application/ld+json">${JSON.stringify([
    { "@type": "LodgingBusiness", name: "Mt Cottages" },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map(([name, href], index) => ({ "@type": "ListItem", position: index + 1, name, item: new URL(href, "https://mtcottages.com").toString() })),
    },
  ])}</script>`;
const page = (body, trail) => `<html><head>${trail ? crumbsSchema(trail) : ""}</head><body>${trail ? crumbsNav(trail) : ""}${body}</body></html>`;

test("pagePathOf and resolveTarget follow GitHub Pages' file mapping", () => {
  assert.equal(pagePathOf("index.html"), "/");
  assert.equal(pagePathOf("marietta/index.html"), "/marietta/");
  assert.equal(pagePathOf("about.html"), "/about.html");
  const files = new Set(["index.html", "about.html", "marietta/index.html", "_astro/a.avif"]);
  assert.equal(resolveTarget("/", files), "index.html");
  assert.equal(resolveTarget("/marietta/", files), "marietta/index.html");
  assert.equal(resolveTarget("/marietta", files), "marietta/index.html");
  assert.equal(resolveTarget("/about", files), "about.html");
  assert.equal(resolveTarget("/about.html", files), "about.html");
  assert.equal(resolveTarget("/_astro/a.avif", files), "_astro/a.avif");
  assert.equal(resolveTarget("/missing.html", files), undefined);
  assert.equal(resolveTarget("/about.html/", files), undefined);
});

test("internalPath keeps site links and drops external, mail and in-page links", () => {
  assert.equal(internalPath("/marietta/?x=1#homes", "/"), "/marietta/");
  assert.equal(internalPath("https://mtcottages.com/about.html", "/"), "/about.html");
  assert.equal(internalPath("location.html", "/marietta/frederick/"), "/marietta/frederick/location.html");
  assert.equal(internalPath("../", "/marietta/frederick/"), "/marietta/");
  assert.equal(internalPath("https://stay.mtcottages.com/?property=frederick", "/"), undefined);
  assert.equal(internalPath("mailto:stay@mtcottages.com", "/"), undefined);
  assert.equal(internalPath("tel:+13045550100", "/"), undefined);
  assert.equal(internalPath("#faq", "/"), undefined);
});

test("extractAnchors reads the accessible name from aria-label, text, then image alt", () => {
  const anchors = extractAnchors(
    '<a href="/a.html" aria-label="Frederick Cottage details">More</a>' +
      '<a href="/b.html">Broad Cottage <span aria-hidden="true">→</span></a>' +
      '<a href="/c.html"><img src="x.avif" alt="Oak Cottage front"></a>' +
      '<a href="/d.html"><span aria-hidden="true">↗</span></a>' +
      "<template><a href=\"/ignored.html\">x</a></template>" +
      '<a name="anchor-only">no href</a>',
  );
  assert.deepEqual(anchors, [
    { href: "/a.html", name: "Frederick Cottage details" },
    { href: "/b.html", name: "Broad Cottage" },
    { href: "/c.html", name: "Oak Cottage front" },
    { href: "/d.html", name: "" },
  ]);
});

test("anchorNameProblem rejects empty and generic anchors only", () => {
  for (const name of ["click here", "Click here!", "Read more", "here", "Learn more →", "more"]) {
    assert.ok(anchorNameProblem(name), name);
  }
  assert.match(anchorNameProblem(""), /no accessible name/);
  for (const name of ["Frederick Cottage", "Read more about Marietta, Ohio", "Furnished homes in Parkersburg"]) {
    assert.equal(anchorNameProblem(name), undefined, name);
  }
});

test("visibleCrumbs skips separators and keeps link targets", () => {
  const trail = [["Home", "/"], ["Marietta, Ohio", "/marietta/"], ["Frederick Cottage", "/marietta/frederick/"]];
  assert.deepEqual(visibleCrumbs(crumbsNav(trail)), [
    { name: "Home", href: "/" },
    { name: "Marietta, Ohio", href: "/marietta/" },
    { name: "Frederick Cottage", href: undefined },
  ]);
  assert.equal(visibleCrumbs("<nav aria-label=\"Main\"></nav>"), undefined);
});

test("breadcrumbProblems passes a matching trail and names each mismatch", () => {
  const trail = [["Home", "/"], ["Marietta, Ohio", "/marietta/"], ["Frederick Cottage", "/marietta/frederick/"]];
  assert.deepEqual(breadcrumbProblems("/marietta/frederick/", page("", trail)), []);

  const noSchema = `<body>${crumbsNav(trail)}</body>`;
  assert.deepEqual(breadcrumbProblems("/marietta/frederick/", noSchema), ["has no BreadcrumbList schema"]);

  const noVisible = `<head>${crumbsSchema(trail)}</head>`;
  assert.match(breadcrumbProblems("/marietta/frederick/", noVisible).join("\n"), /no visible breadcrumb trail/);

  const renamed = `${crumbsSchema(trail)}${crumbsNav([["Home", "/"], ["Marietta", "/marietta/"], ["Frederick Cottage", "/marietta/frederick/"]])}`;
  assert.match(breadcrumbProblems("/marietta/frederick/", renamed).join("\n"), /do not match/);

  assert.match(breadcrumbProblems("/marietta/frederick/location.html", page("", trail)).join("\n"), /not this page/);

  // The last crumb is compared with the page's canonical; /x/index.html and /x/ are one document.
  const town = [["Home", "/"], ["Marietta, Ohio", "/marietta/index.html"]];
  assert.deepEqual(breadcrumbProblems("/marietta/", `<link rel="canonical" href="https://mtcottages.com/marietta/">${page("", town)}`), []);

  const twice = `${crumbsSchema(trail)}${crumbsSchema(trail)}${crumbsNav(trail)}`;
  assert.match(breadcrumbProblems("/marietta/frederick/", twice).join("\n"), /2 BreadcrumbList blocks/);
});

test("analyseSite finds broken links, redirect links, orphans and generic anchors", () => {
  const homeTrail = (name, href) => [["Home", "/"], [name, href]];
  const pages = [
    { file: "index.html", markup: page('<a href="/about.html">About Mt Cottages</a><a href="/old.html">Old summary</a><a href="/gone.html">Gone page</a>') },
    { file: "about.html", markup: page('<a href="/">Mt Cottages home</a><a href="/about.html">click here</a>', homeTrail("About", "/about.html")) },
    { file: "orphan.html", markup: page('<a href="/">Home page</a>', homeTrail("Orphan", "/orphan.html")) },
    { file: "old.html", markup: '<meta http-equiv="refresh" content="0;url=/about.html"><a href="/about.html">/about.html</a>' },
    { file: "private.html", markup: '<meta name="robots" content="noindex"><a href="/orphan.html">Orphan guide</a>' },
    { file: "404.html", markup: page('<a href="/">Back to Mt Cottages</a>') },
  ];
  const files = new Set(pages.map((entry) => entry.file));
  const { errors, indexable, redirects } = analyseSite(pages, files);
  assert.equal(indexable, 3);
  assert.equal(redirects, 1);
  assert.deepEqual(errors.sort(), [
    "/: broken internal link to /gone.html (nothing is built at /gone.html)",
    "/: links to /old.html, which only redirects; link to its destination instead",
    '/about.html: the link to /about.html uses the non-descriptive anchor "click here"',
    // A noindex page's link does not rescue an orphan, and nothing links to orphan.html otherwise.
    "/orphan.html: orphan page; no other indexable page links to it",
  ].sort());
});
