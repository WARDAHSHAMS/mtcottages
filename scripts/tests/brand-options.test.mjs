// WCAG contrast and consistency checks for the brand-system options (#27).
// Run: node --test scripts/tests/brand-options.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../../docs/marketing/brand-options/", import.meta.url);
const data = JSON.parse(readFileSync(new URL("options.json", root), "utf8"));

const HEX = /^#[0-9a-f]{6}$/;

/** WCAG 2.2 relative luminance of a #rrggbb colour. */
export function luminance(hex) {
  if (!HEX.test(hex)) throw new Error(`not a lowercase #rrggbb colour: ${hex}`);
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function resolve(option, name) {
  if (name.startsWith("#")) return name;
  if (name === "onDark") return data.onDark;
  const value = option.tokens[name];
  if (!value) throw new Error(`option ${option.id}: unknown token ${name}`);
  return value;
}

test("contrast maths matches the WCAG reference values", () => {
  assert.equal(contrast("#000000", "#ffffff").toFixed(1), "21.0");
  assert.equal(contrast("#777777", "#ffffff").toFixed(2), "4.48");
  assert.equal(contrast("#767676", "#ffffff").toFixed(2), "4.54");
});

test("there are exactly three options with every token set", () => {
  assert.equal(data.options.length, 3);
  const names = Object.keys(data.options[0].tokens).sort();
  for (const option of data.options) {
    assert.deepEqual(Object.keys(option.tokens).sort(), names, `option ${option.id} token set`);
    for (const [name, value] of Object.entries(option.tokens)) {
      assert.match(value, HEX, `option ${option.id} ${name}`);
    }
  }
});

for (const option of data.options) {
  test(`option ${option.id} (${option.name}): every text pair passes WCAG AA 4.5:1`, () => {
    const failures = data.textPairs
      .map(([fg, bg]) => ({ fg, bg, ratio: contrast(resolve(option, fg), resolve(option, bg)) }))
      .filter(({ ratio }) => ratio < 4.5)
      .map(({ fg, bg, ratio }) => `${fg} on ${bg}: ${ratio.toFixed(2)}`);
    assert.deepEqual(failures, []);
  });

  test(`option ${option.id} (${option.name}): every non-text pair passes 3:1`, () => {
    const failures = data.uiPairs
      .map(([fg, bg]) => ({ fg, bg, ratio: contrast(resolve(option, fg), resolve(option, bg)) }))
      .filter(({ ratio }) => ratio < 3)
      .map(({ fg, bg, ratio }) => `${fg} on ${bg}: ${ratio.toFixed(2)}`);
    assert.deepEqual(failures, []);
  });

  test(`option ${option.id} (${option.name}): fonts are free and self-hostable`, () => {
    for (const role of ["display", "body"]) {
      const font = option.fonts[role];
      assert.equal(font.licence, "OFL-1.1", `${role} licence`);
      assert.match(font.package, /^@fontsource\/[a-z0-9-]+$/, `${role} package`);
      assert.ok(font.weights.length > 0, `${role} weights`);
    }
  });

  test(`option ${option.id} (${option.name}): wordmark uses only the option's colours and fonts`, () => {
    const svg = readFileSync(new URL(option.wordmark, root), "utf8");
    assert.match(svg, /<title id="[^"]+">Mt Cottages<\/title>/);
    assert.match(svg, /role="img"/);
    const palette = new Set(Object.values(option.tokens));
    const used = [...svg.matchAll(/(?:fill|stroke)="(#[0-9a-f]{6})"/g)].map((m) => m[1]);
    assert.ok(used.length > 0, "wordmark has colours");
    for (const colour of used) assert.ok(palette.has(colour), `${colour} is not an option ${option.id} token`);
    for (const [, family] of svg.matchAll(/font-family="'?([^,'"]+)/g)) {
      assert.ok([option.fonts.display.family, option.fonts.body.family].includes(family), `${family} is not an option ${option.id} font`);
    }
    // Wordmark text must also read on the page background.
    for (const colour of used) {
      if (colour === option.tokens.accent) continue;
      assert.ok(contrast(colour, option.tokens.canvas) >= 4.5, `${colour} on canvas`);
    }
  });
}
