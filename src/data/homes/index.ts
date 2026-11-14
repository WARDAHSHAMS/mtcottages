import type { ImageMetadata } from "astro";
import { frederick } from "../residences/frederick";
import { henriettaHome } from "./henrietta";
import { oakHome } from "./oak";
import { broadHome } from "./broad";
import { buckHome } from "./buck";
import { yellowHome } from "./yellow";
import { walnutHome } from "./walnut";
import { virginiaHome } from "./virginia";
import type { HomeMicrosite } from "./types";

/**
 * Every data-driven microsite, one per listed home except Frederick, which
 * keeps its hand-authored pages. Order follows the town grouping on the site.
 */
export const homes: HomeMicrosite[] = [broadHome, buckHome, yellowHome, oakHome, walnutHome, virginiaHome, henriettaHome];

export type FamilyMember = {
  id: string;
  name: string;
  town: string;
  href: string;
  hero: { src: ImageMetadata; alt: string; focal?: string };
  bedrooms: number;
};

/** Every home in the Mt Cottages microsite family, for the switcher. */
export const family: FamilyMember[] = [
  {
    id: frederick.id,
    name: frederick.name,
    town: frederick.town,
    href: `/${frederick.basePath}/index.html`,
    hero: frederick.hero,
    bedrooms: Number.parseInt(frederick.bedrooms, 10),
  },
  ...homes.map((home) => ({
    id: home.id,
    name: home.name,
    town: `${home.town.name}, ${home.town.state}`,
    href: `/${home.town.slug}/${home.slug}/`,
    hero: home.hero,
    bedrooms: home.bedrooms,
  })),
];
