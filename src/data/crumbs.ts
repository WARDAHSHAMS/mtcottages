/**
 * Breadcrumb primitives (#35). Every page except the home page renders one
 * trail with <Breadcrumbs items={trail} /> and passes the same list to
 * SiteLayout's `breadcrumbs` prop. The site's hierarchy is
 *   Home / Locations / <Town, State> / <Home name> / <Microsite page>
 *   Home / <Section> / <Page>   (guides, services, residents, cottages)
 *
 * This module must stay a leaf: it imports nothing. src/data/site.ts builds
 * its navigation trails from it, and src/data/schema.ts (which imports the
 * homes, whose resident guides read terms.ts, which reads site.ts) re-exports
 * it. If site.ts imported schema.ts instead, that cycle would leave
 * `cottages` undefined while terms.ts evaluates and break the build.
 */
export type Crumb = { name: string; href: string };

export const homeCrumb: Crumb = { name: "Home", href: "/" };
export const locationsCrumb: Crumb = { name: "Locations", href: "/locations.html" };

/** A trail under the home page: Home / …trail. */
export const pageCrumbs = (...trail: Crumb[]): Crumb[] => [homeCrumb, ...trail];
