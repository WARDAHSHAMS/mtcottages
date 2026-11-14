import type { ImageMetadata } from "astro";
import { frederickHome } from "./frederick";
import { henriettaHome } from "./henrietta";
import { oakHome } from "./oak";
import { broadHome } from "./broad";
import { buckHome } from "./buck";
import { virginiaHome } from "./virginia";
import { homeBase } from "./links";
import type { HomeMicrosite } from "./types";

/**
 * Every home microsite, all rendered by the shared template in
 * src/pages/[town]/[home]. Order follows the town grouping on the site.
 * Yellow and Walnut have no microsite (CEO decision 2026-11-14) and keep their
 * single property pages.
 */
export const homes: HomeMicrosite[] = [frederickHome, broadHome, buckHome, oakHome, virginiaHome, henriettaHome];

export type FamilyMember = {
  id: string;
  name: string;
  town: string;
  href: string;
  hero: { src: ImageMetadata; alt: string; focal?: string };
  bedrooms: number;
};

/** Every home in the Mt Cottages microsite family, for the switcher. */
export const family: FamilyMember[] = homes.map((home) => ({
  id: home.id,
  name: home.name,
  town: `${home.town.name}, ${home.town.state}`,
  href: homeBase(home),
  hero: home.hero,
  bedrooms: home.bedrooms,
}));
