// The chosen brand (option A, "River & Brick", #59) is what the site and the stay form actually ship.
// Run: node --test scripts/tests/brand-applied.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const options = JSON.parse(read("docs/marketing/brand-options/options.json"));
const option = options.options.find((candidate) => candidate.id === "a");
assert.ok(option, "options.json has option a");

const siteCss = read("src/styles/site.css");
const form = read("infra/azure/apply-proxy/index.html");

/** Custom properties declared in the first :root block that contains them. */
function declared(css, names) {
  return Object.fromEntries(
    names.map((name) => {
      const match = css.match(new RegExp(`--${name}:\\s*([^;}]+?)\\s*[;}]`));
      assert.ok(match, `--${name} is declared`);
      return [name, match[1]];
    }),
  );
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test("site.css carries every option A colour token", () => {
  const tokens = Object.keys(option.tokens);
  assert.deepEqual(declared(siteCss, tokens), option.tokens);
});

test("site.css carries option A's shape and heading type", () => {
  const got = declared(siteCss, ["radius", "button-radius", "heading-weight", "heading-tracking", "heading-leading", "step-2", "step-3"]);
  assert.equal(got.radius, option.shape.radius);
  assert.equal(got["button-radius"], option.shape.buttonRadius);
  assert.equal(got["heading-weight"], String(option.type.headingWeight));
  assert.equal(got["heading-tracking"], option.type.headingTracking);
  assert.equal(got["heading-leading"], option.type.headingLeading);
  assert.equal(got["step-2"], option.type["step-2"]);
  assert.equal(got["step-3"], option.type["step-3"]);
});

test("display and body stacks lead with option A's families and keep real fallbacks", () => {
  const { display, body } = declared(siteCss, ["display", "body"]);
  assert.match(display, new RegExp(`^"${option.fonts.display.family}", Georgia, .*serif$`));
  assert.match(body, new RegExp(`^"${option.fonts.body.family}", .*(system-ui).*sans-serif$`));
  const formStacks = declared(form, ["display", "body"]);
  assert.equal(formStacks.display.replaceAll(",", ", "), display);
  assert.match(formStacks.body, new RegExp(`^"${option.fonts.body.family}",`));
});

test("every font file the CSS names is published in public/fonts and is a Latin woff2", () => {
  const urls = [...siteCss.matchAll(/url\("\/fonts\/([^"]+)"\)/g)].map((match) => match[1]);
  const wanted = [
    ...option.fonts.display.weights.map((w) => `${option.fonts.display.file}-latin-${w}-normal.woff2`),
    ...option.fonts.body.weights.map((w) => `${option.fonts.body.file}-latin-${w}-normal.woff2`),
  ];
  assert.deepEqual([...urls].sort(), [...wanted].sort());
  for (const file of urls) assert.ok(existsSync(new URL(`../../public/fonts/${file}`, import.meta.url)), `${file} is in public/fonts`);
  assert.doesNotMatch(siteCss, /fonts\.(googleapis|gstatic)\.com/);
  assert.match(siteCss, /font-display: swap/);
});

test("the stay form uses the same colour, radius and heading values as the site", () => {
  const names = ["canvas", "paper", "ink", "muted", "line", "accent", "accent-ink", "forest", "forest-soft", "sun"];
  const got = declared(form, names);
  for (const name of names) assert.equal(got[name], option.tokens[name], `form --${name}`);
  const shape = declared(form, ["radius", "button-radius", "heading-weight", "heading-tracking", "heading-leading"]);
  assert.equal(shape.radius, option.shape.radius);
  assert.equal(shape["button-radius"], option.shape.buttonRadius);
  assert.equal(shape["heading-weight"], String(option.type.headingWeight));
  assert.equal(shape["heading-tracking"], option.type.headingTracking);
  assert.equal(shape["heading-leading"], option.type.headingLeading);
  assert.match(form, /name="theme-color" content="#1d4b68"/);
});

test("no pre-brand colour value is left in the site or the form", () => {
  const legacy = ["#f3f4ee", "#fffefa", "#252525", "#5e685f", "#dfe2d9", "#c77b59", "#3f4d3c", "#9a4f2e", "#e4b482", "#e5ebe2", "#ece8de", "#52614e", "#a85a3a", "#40503d"];
  const files = ["src/styles/site.css", "src/styles/homes.css", "src/styles/travel-nurses.css", "src/styles/town-landing.css", "src/layouts/SiteLayout.astro", "src/components/home/FloorPlanSvg.astro", "src/components/home/PlanModel.astro", "src/components/home/DistanceTable.astro", "src/components/guides/CtaBlock.astro", "src/components/guides/ChartBlock.astro", "src/components/SiteFooter.astro", "src/components/GuidePage.astro", "src/components/home/InquiryPanel.astro", "infra/azure/apply-proxy/index.html"];
  for (const file of files) {
    const text = read(file).toLowerCase();
    for (const value of legacy) assert.ok(!text.includes(value), `${file} still has ${value}`);
  }
});

// Pairs the page CSS sets with literal colours rather than a token (white or the on-dark cream over a brand surface).
test("literal text-on-brand pairs used in the page CSS pass WCAG AA", () => {
  const t = option.tokens;
  const pairs = [
    ["#ffffff", t.forest], ["#ffffff", t["accent-ink"]], ["#ffffff", t.charcoal], ["#ffffff", t.accent],
    [options.onDark, t.forest], [options.onDark, t.charcoal],
    [t.gold, t.forest], ["#f0d1a9", t.forest], [t.gold, t.charcoal],
    [t.muted, t["forest-soft"]], [t.forest, t["forest-soft"]], [t.forest, t.sun], [t.ink, t.sun], [t["accent-ink"], t.sun], [t["accent-ink"], t["forest-soft"]],
  ];
  const failures = pairs.map(([fg, bg]) => ({ fg, bg, ratio: contrast(fg, bg) })).filter(({ ratio }) => ratio < 4.5).map(({ fg, bg, ratio }) => `${fg} on ${bg}: ${ratio.toFixed(2)}`);
  assert.deepEqual(failures, []);
});
