import type { APIRoute } from "astro";

// The old /about.html summary became the "Who we are" page at /about/ (#38). The old URL
// stays reachable for existing links and bookmarks as a small noindex meta-refresh page
// that canonicalises to /about/, so it never enters the sitemap. Same stub shape as
// src/pages/health-professionals.html.ts.
const target = "/about/";

export const GET: APIRoute = () => {
  const html = `<!doctype html><html lang="en-US"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>About Mt Cottages has moved</title><meta http-equiv="refresh" content="0;url=${target}"><meta name="robots" content="noindex"><link rel="canonical" href="https://mtcottages.com${target}"></head><body><p><a href="${target}">About Mt Cottages has moved to its own page</a></p></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
};
