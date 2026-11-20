# Brand-system options

_Issue: WorldEnterpriseGroup/mtcottages#27. Prepared 2026-11-15 for the CEO's pick (owner decision D2 in `docs/marketing/brand-and-positioning.md`). Option A was chosen on #27 and applied in #59: its tokens and fonts are live on the site and the stay form. Options B and C remain here for reference only. The logo and wordmark were not changed._

All three follow the brand brief: river blue, brick and limestone; a heritage serif with a clean sans; free, self-hosted fonts. They differ in mood:

| | A. River & Brick | B. Front Porch | C. Valley Modern |
|---|---|---|---|
| Feel | Heritage river town, confident and civic | Warm, lived-in, welcoming | Clean, editorial, for working guests |
| Headings | Source Serif 4, semibold | Fraunces, medium (italic in the wordmark) | Newsreader, medium |
| Text | Source Sans 3 | Figtree | Inter |
| Background | Limestone `#f4efe6` | Cream `#faf4ea` | Cool limestone `#f3f5f4` |
| Primary | River navy `#1d4b68` | Porch teal `#23505a` | Deep river `#0f4c6e` |
| Brick | `#9e3b26` | `#a8432a` | `#b0432a` |
| Corners | Crisp (4px), square buttons | Soft (14px), pill buttons | Moderate (8px) |
| Wordmark | `MT COTTAGES` in spaced capitals over a river line, brick dot | Italic "Mt" under a brick roofline, "Cottages" in the serif | `mtcottages` in bold lowercase, brick dot |

![All three options side by side: wordmark, palette, type and contrast](screenshots/options-board.png)

## On our own pages

Each option is rendered on the real home page and Frederick Cottage's microsite, at desktop width (1440px) and on a 390px phone, next to the current site. Photos and copy are unchanged; only colour, type, corners and the wordmark differ.

| Page | Current | A. River & Brick | B. Front Porch | C. Valley Modern |
|---|---|---|---|---|
| Home, desktop | ![](screenshots/current-home-desktop.png) | ![](screenshots/option-a-home-desktop.png) | ![](screenshots/option-b-home-desktop.png) | ![](screenshots/option-c-home-desktop.png) |
| Home, phone | ![](screenshots/current-home-phone.png) | ![](screenshots/option-a-home-phone.png) | ![](screenshots/option-b-home-phone.png) | ![](screenshots/option-c-home-phone.png) |
| Frederick, desktop | ![](screenshots/current-frederick-desktop.png) | ![](screenshots/option-a-frederick-desktop.png) | ![](screenshots/option-b-frederick-desktop.png) | ![](screenshots/option-c-frederick-desktop.png) |
| Frederick, phone | ![](screenshots/current-frederick-phone.png) | ![](screenshots/option-a-frederick-phone.png) | ![](screenshots/option-b-frederick-phone.png) | ![](screenshots/option-c-frederick-phone.png) |

## Accessibility

Every text colour pair passes WCAG AA (4.5:1) and every non-text pair (links' underline colour, focus rings, chart bars) passes 3:1. `scripts/tests/brand-options.test.mjs` recomputes them from `options.json`, so a token change that breaks contrast fails CI.

| Pair | A | B | C |
|---|---|---|---|
| Text on background | 12.8 | 14.0 | 14.9 |
| Quiet text on background | 6.1 | 6.6 | 6.9 |
| White on primary button | 9.3 | 8.9 | 9.2 |
| Brick on background | 5.9 | 5.5 | 5.2 |
| Highlight on the dark band | 9.2 | 9.0 | 10.0 |

## Files

- `options.json`: the tokens (colour, type scale, heading weight and tracking, radius), fonts with their Fontsource packages and licence, and the pairs the contrast test checks. Token names match the custom properties in `src/styles/site.css`, so applying a pick is a token swap plus the wordmark.
- `wordmark-a.svg`, `wordmark-b.svg`, `wordmark-c.svg`: the wordmarks. They set live text in the option's font; when a pick ships, outline the text to paths (or self-host the font) so the logo renders the same everywhere.
- `screenshots/`: rendered by the `brand:capture` GitLab job (`e2e/brand/capture.spec.js`), which injects an option's tokens, fonts and wordmark into the built site in the browser only.

## Fonts and licences

All six families are under the SIL Open Font License 1.1, free for commercial use and self-hosting, and are installed from Fontsource (`@fontsource/*`), not loaded from a third-party CDN. The capture job records the exact package versions in `font-versions.txt` next to its screenshots.

## Not decided here

- The name story ("Mt", D1) is the owner's. Wordmark B's roofline and A's river line work with either story; none of the marks draws a mountain, so they stay true if "Mt" turns out not to mean Mount.
- The tagline on the board ("A real home in the river towns, ready the day you arrive.") is the brand-brief promise, shown for type only.

## Next step

The CEO picks A, B or C (or asks for a mix) on #11. That pick spawns the "apply brand tokens" issue: swap the tokens in `src/styles/site.css`, self-host the two fonts, replace `assets/images/logo-mtcottages.svg`, and run the full Lighthouse and axe gates.
