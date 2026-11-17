// Search-result titles (#69). Google truncates titles near 60 characters, so
// the brand suffix is added only when the whole title still fits, and a core
// title that cannot fit on its own fails the build instead of shipping cut off.
// scripts/seo-audit.mjs enforces the same limits on the built site.
export const BRAND = "Mt Cottages";
export const TITLE_MAX = 60;

export const pageTitle = (core: string): string => {
  const text = core.trim();
  if (!text) throw new Error("pageTitle: empty title");
  if (text.length > TITLE_MAX) throw new Error(`pageTitle: "${text}" is ${text.length} characters (max ${TITLE_MAX})`);
  if (text.includes(BRAND)) return text;
  const branded = `${text} | ${BRAND}`;
  return branded.length <= TITLE_MAX ? branded : text;
};

/** "Marietta, Ohio" reads as people search for it; the West Virginia towns keep the WV abbreviation. */
export const placeName = (town: { name: string; state: string }): string =>
  town.state === "OH" ? `${town.name}, Ohio` : `${town.name}, ${town.state}`;
