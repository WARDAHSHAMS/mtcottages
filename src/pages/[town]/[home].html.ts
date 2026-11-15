import type { APIRoute } from "astro";
import { homes } from "../../data/homes";
import { homeBase } from "../../data/homes/links";
import { parkedHomePages } from "../../data/site";

// The old one-page summaries (/ravenswood/henrietta-cottage.html and friends)
// now point at each home's microsite. Astro's own `redirects` cannot express
// these without colliding with the microsite index route, so they are emitted
// here as small meta-refresh pages. A home can list extra older slugs
// (e.g. Buck's /parkersburg/buck-apartment-1.html) in `legacySlugs`.
// Parked homes (Yellow, Walnut) are not listed, so their old pages send the
// guest to the town page, which shows the homes that are.
type Props = { target: string; title: string; message: string };

export function getStaticPaths() {
  const microsites = homes.flatMap((home) =>
    [home.slug, ...(home.legacySlugs ?? [])].map((slug) => ({
      params: { town: home.town.slug, home: slug },
      props: { target: homeBase(home), title: `Redirecting to ${home.name}`, message: `${home.name} has moved to its own site` } satisfies Props,
    })),
  );
  const parked = parkedHomePages.map((page) => ({
    params: { town: page.town, home: page.slug },
    props: { target: page.target, title: `Furnished homes in ${page.townName}`, message: `See the furnished homes listed in ${page.townName}` } satisfies Props,
  }));
  return [...microsites, ...parked];
}

export const GET: APIRoute = ({ props }) => {
  const { target, title, message } = props as Props;
  const html = `<!doctype html><html lang="en-US"><head><meta charset="utf-8"><title>${title}</title><meta http-equiv="refresh" content="0;url=${target}"><meta name="robots" content="noindex"><link rel="canonical" href="https://mtcottages.com${target}"></head><body><a href="${target}">${message}</a></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
};
