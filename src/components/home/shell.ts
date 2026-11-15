import type { HomeMicrosite } from "../../data/homes/types";
import { homeBase, homeHref, homePages } from "../../data/homes/links";

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
};

export const homeShell = (home: HomeMicrosite): HomeShell => ({
  id: home.id,
  name: home.name,
  townName: home.town.name,
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
