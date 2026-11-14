import type { APIRoute } from "astro";
import { homes } from "../../data/homes";
import { homeBase } from "../../data/homes/links";

// The old one-page summaries (/ravenswood/henrietta-cottage.html and friends)
// now point at each home's microsite. Astro's own `redirects` cannot express
// these without colliding with the microsite index route, so they are emitted
// here as small meta-refresh pages. A home can list extra older slugs
// (e.g. Buck's /parkersburg/buck-apartment-1.html) in `legacySlugs`.
export function getStaticPaths() {
  return homes.flatMap((home) =>
    [home.slug, ...(home.legacySlugs ?? [])].map((slug) => ({
      params: { town: home.town.slug, home: slug },
      props: { target: homeBase(home), name: home.name },
    })),
  );
}

export const GET: APIRoute = ({ props }) => {
  const { target, name } = props as { target: string; name: string };
  const html = `<!doctype html><html lang="en-US"><head><meta charset="utf-8"><title>Redirecting to ${name}</title><meta http-equiv="refresh" content="0;url=${target}"><meta name="robots" content="noindex"><link rel="canonical" href="https://mtcottages.com${target}"></head><body><a href="${target}">${name} has moved to its own site</a></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
};
