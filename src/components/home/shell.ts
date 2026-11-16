import type { HomeMicrosite } from "../../data/homes/types";
import { homeBase, homeHref, homePages } from "../../data/homes/links";
import { homeCrumb, locationsCrumb, townLabel, type Crumb } from "../../data/schema";

export type HomeNavItem = { label: string; href: string; description: string };

/** What the shared shell (nav, hero, switcher, inquiry panel) needs to know about any home. */
export type HomeShell = {
  id: string;
  name: string;
  townName: string;
  townHref: string;
  baseHref: string;
  brandSub: string;
  nav: HomeNavItem[];
  /** The "See distances" target: nearby places with drive and walk times. */
  distancesHref: string;
  /** "Marietta, Ohio": the town's breadcrumb label, the same one its town page uses. */
  townLabel: string;
};

/** Compare normalised paths so "/x/y/", "/x/y/index.html" and "/x/y" all match the index entry. */
export const samePage = (a: string, b: string) => {
  const norm = (path: string) => path.replace(/index\.html$/, "").replace(/\/+$/, "");
  return norm(a) === norm(b);
};

/**
 * The microsite page's breadcrumb trail (#35):
 * Home / Locations / Marietta, Ohio / Frederick Cottage [/ Tour].
 */
export const homeCrumbs = (shell: HomeShell, current: string): Crumb[] => {
  const trail: Crumb[] = [homeCrumb, locationsCrumb, { name: shell.townLabel, href: shell.townHref }, { name: shell.name, href: shell.baseHref }];
  const page = shell.nav.slice(1).find((item) => samePage(item.href, current));
  return page ? [...trail, { name: page.label, href: page.href }] : trail;
};

export const homeShell = (home: HomeMicrosite): HomeShell => ({
  id: home.id,
  name: home.name,
  townName: home.town.name,
  townLabel: townLabel(home.town.name, home.town.state),
  townHref: `/${home.town.slug}/index.html`,
  baseHref: homeBase(home),
  brandSub: `${home.town.name}, ${home.town.state} · Furnished home`,
  nav: [
    { label: "Overview", href: homeHref(home), description: "Facts, highlights and rooms at a glance." },
    { label: "Tour", href: homeHref(home, "tour"), description: "Room-by-room photo story." },
    { label: "Plan & 3D", href: homeHref(home, "plan"), description: "Concept floor plan and 3D model." },
    { label: "Amenities", href: homeHref(home, "amenities"), description: "What is listed, photographed or still to confirm." },
    { label: "Location", href: homeHref(home, "location"), description: "Address, directions and nearby places." },
    ...(homePages(home).includes("guide")
      ? [{ label: "Guide", href: homeHref(home, "guide"), description: "Utilities, arrival and how living here works." }]
      : []),
  ],
  distancesHref: `${homeHref(home, "location")}#nearby`,
});
