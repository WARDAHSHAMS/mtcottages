// Renders each brand-system option (#27) on our real pages and saves
// screenshots for the CEO's pick. The production site is not changed: the
// option's tokens, self-hosted fonts and wordmark are injected into the page
// in the browser only.
//
// BRAND_FONT_DIR: a directory whose node_modules holds the @fontsource
//   packages named in options.json (the CI job installs them there).
// BRAND_SHOT_DIR: where the PNGs go (default: the options folder).
const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const optionsDir = path.resolve(__dirname, "../../docs/marketing/brand-options");
const data = JSON.parse(fs.readFileSync(path.join(optionsDir, "options.json"), "utf8"));
const fontRoot = process.env.BRAND_FONT_DIR;
const shotDir = process.env.BRAND_SHOT_DIR || path.join(optionsDir, "screenshots");

const pages = [
  { id: "home", url: "/index.html" },
  { id: "frederick", url: "/marietta/frederick/index.html" }
];
const viewports = [
  { id: "desktop", width: 1440, height: 1400, scale: 1 },
  { id: "phone", width: 390, height: 1100, scale: 2 }
];

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function fontFiles(option) {
  const files = [];
  for (const role of ["display", "body"]) {
    const font = option.fonts[role];
    const styles = font.italic ? ["normal", "italic"] : ["normal"];
    for (const weight of font.weights) {
      for (const style of styles) {
        files.push({ font, weight, style, name: `${font.file}-latin-${weight}-${style}.woff2` });
      }
    }
  }
  return files;
}

function fontFaceCss(option) {
  return fontFiles(option)
    .map(({ font, weight, style, name }) => `@font-face { font-family: "${font.family}"; font-style: ${style}; font-weight: ${weight}; font-display: block; src: url("/__brand-fonts/${font.file}/${name}") format("woff2"); }`)
    .join("\n");
}

function optionCss(option) {
  const tokens = Object.entries(option.tokens).map(([name, value]) => `--${name}: ${value};`).join(" ");
  return `${fontFaceCss(option)}
:root { ${tokens}
  --display: "${option.fonts.display.family}", Georgia, serif;
  --body: "${option.fonts.body.family}", system-ui, sans-serif;
  --radius: ${option.shape.radius};
  --step-2: ${option.type["step-2"]};
  --step-3: ${option.type["step-3"]}; }
h1, h2, h3 { font-weight: ${option.type.headingWeight}; letter-spacing: ${option.type.headingTracking}; line-height: ${option.type.headingLeading}; }
.button, .header-cta { border-radius: ${option.shape.buttonRadius}; }
.brand svg { display: block; width: auto; height: 2.75rem; }
@media (max-width: 760px) { .brand svg { height: 2.3rem; } }`;
}

/** Serves the option's woff2 files from the installed @fontsource packages. */
async function serveFonts(page, missing) {
  const byFile = new Map(data.options.flatMap((option) => ["display", "body"].map((role) => [option.fonts[role].file, option.fonts[role].package])));
  await page.route("**/__brand-fonts/**", async (route) => {
    const [, file, name] = new URL(route.request().url()).pathname.match(/__brand-fonts\/([^/]+)\/([^/]+)$/) || [];
    const pkg = byFile.get(file);
    const local = pkg && fontRoot ? path.join(fontRoot, "node_modules", pkg, "files", name) : "";
    if (!local || !fs.existsSync(local)) {
      missing.push(name || route.request().url());
      await route.fulfill({ status: 404, body: "" });
      return;
    }
    await route.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync(local) });
  });
}

async function settle(page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts.ready;
    const visible = [...document.images].filter((img) => img.getBoundingClientRect().top < window.innerHeight);
    await Promise.all(visible.map((img) => (img.complete ? null : new Promise((done) => { img.onload = done; img.onerror = done; }))));
  });
}

async function applyOption(page, option) {
  await page.addStyleTag({ content: optionCss(option) });
  const svg = fs.readFileSync(path.join(optionsDir, option.wordmark), "utf8");
  const swapped = await page.evaluate((markup) => {
    const images = [...document.querySelectorAll(".brand img")];
    for (const img of images) {
      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      img.replaceWith(template.content.firstElementChild);
    }
    return images.length;
  }, svg);
  expect(swapped, "header wordmark replaced").toBeGreaterThan(0);
  const loaded = await page.evaluate(async (specs) => {
    await Promise.all(specs.map((spec) => document.fonts.load(spec)));
    return specs.filter((spec) => !document.fonts.check(spec));
  }, fontFiles(option).map(({ font, weight, style }) => `${style} ${weight} 20px "${font.family}"`));
  expect(loaded, `option ${option.id} fonts loaded`).toEqual([]);
}

fs.mkdirSync(shotDir, { recursive: true });

for (const viewport of viewports) {
  for (const target of pages) {
    test(`current site: ${target.id} ${viewport.id}`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: viewport.scale });
      const page = await context.newPage();
      await page.goto(target.url);
      await settle(page);
      await page.screenshot({ path: path.join(shotDir, `current-${target.id}-${viewport.id}.png`) });
      await context.close();
    });

    for (const option of data.options) {
      test(`option ${option.id} ${option.name}: ${target.id} ${viewport.id}`, async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: viewport.scale });
        const page = await context.newPage();
        const missing = [];
        await serveFonts(page, missing);
        await page.goto(target.url);
        await applyOption(page, option);
        await settle(page);
        expect(missing, "font files found").toEqual([]);
        await page.screenshot({ path: path.join(shotDir, `option-${option.id}-${target.id}-${viewport.id}.png`) });
        await context.close();
      });
    }
  }
}

const escape = (text) => String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function boardHtml() {
  const swatchRoles = [["canvas", "Background"], ["paper", "Cards"], ["ink", "Text"], ["muted", "Quiet text"], ["forest", "Primary"], ["accent-ink", "Brick"], ["gold", "Highlight on dark"], ["charcoal", "Dark band"]];
  const columns = data.options.map((option) => {
    const t = option.tokens;
    const svg = fs.readFileSync(path.join(optionsDir, option.wordmark), "utf8").replace(/id="([^"]+)"/g, `id="$1-board"`).replace(/aria-labelledby="([^"]+)"/g, `aria-labelledby="$1-board"`);
    const swatches = swatchRoles.map(([role, label]) => {
      const text = contrast("#ffffff", t[role]) >= contrast(t.ink, t[role]) ? "#ffffff" : t.ink;
      return `<li style="background:${t[role]};color:${text}"><b>${label}</b><span>${t[role]}</span></li>`;
    }).join("");
    const ratios = [["Text on background", t.ink, t.canvas], ["Quiet text on background", t.muted, t.canvas], ["White on primary button", "#ffffff", t.forest], ["Brick on background", t["accent-ink"], t.canvas], ["Highlight on dark band", t.gold, t.charcoal]]
      .map(([label, fg, bg]) => `<tr><th scope="row">${label}</th><td>${contrast(fg, bg).toFixed(1)}:1</td></tr>`).join("");
    return `<section class="option" style="--canvas:${t.canvas};--paper:${t.paper};--ink:${t.ink};--muted:${t.muted};--forest:${t.forest};--brick:${t["accent-ink"]};--line:${t.line};--display:'${option.fonts.display.family}', Georgia, serif;--body:'${option.fonts.body.family}', system-ui, sans-serif;--radius:${option.shape.radius};--button-radius:${option.shape.buttonRadius};--weight:${option.type.headingWeight};--tracking:${option.type.headingTracking}">
  <p class="tag">Option ${option.id.toUpperCase()}</p>
  <h2>${escape(option.name)}</h2>
  <div class="mark">${svg}</div>
  <p class="idea">${escape(option.idea)}</p>
  <h3>A real home in the river towns, ready the day you arrive.</h3>
  <p class="body">Furnished whole houses in Marietta, Parkersburg and Ravenswood for stays of a month or longer, run by a local team who answers.</p>
  <p><a class="button" href="#">Check availability</a> <a class="link" href="#">See drive times</a></p>
  <ul class="swatches">${swatches}</ul>
  <p class="fonts"><b>Headings</b> ${escape(option.fonts.display.family)} · <b>Text</b> ${escape(option.fonts.body.family)} · free (SIL OFL), self-hosted</p>
  <table><caption>WCAG contrast (AA needs 4.5:1)</caption>${ratios}</table>
</section>`;
  }).join("");
  const faces = data.options.map(fontFaceCss).join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Mt Cottages brand options</title><style>
${faces}
* { box-sizing: border-box; }
body { margin: 0; padding: 40px; background: #eceae4; font-family: system-ui, sans-serif; color: #1c1c1c; }
header h1 { margin: 0 0 6px; font-size: 28px; }
header p { margin: 0 0 28px; color: #454545; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.option { padding: 28px; border-radius: 10px; background: var(--canvas); color: var(--ink); font-family: var(--body); }
.tag { margin: 0; color: var(--muted); font-size: 13px; letter-spacing: .12em; text-transform: uppercase; }
h2 { margin: 4px 0 18px; font-family: var(--display); font-size: 30px; font-weight: var(--weight); letter-spacing: var(--tracking); }
.mark { padding: 22px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--paper); }
.mark svg { display: block; height: 46px; width: auto; }
.idea { color: var(--muted); font-size: 15px; line-height: 1.5; }
h3 { margin: 22px 0 10px; font-family: var(--display); font-size: 31px; font-weight: var(--weight); letter-spacing: var(--tracking); line-height: 1.08; }
.body { font-size: 17px; line-height: 1.6; }
.button { display: inline-block; padding: 12px 18px; border-radius: var(--button-radius); background: var(--forest); color: #fff; font-weight: 700; text-decoration: none; }
.link { margin-left: 14px; color: var(--brick); font-weight: 700; }
.swatches { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 24px 0 14px; padding: 0; list-style: none; }
.swatches li { display: grid; min-height: 74px; align-content: end; padding: 8px; border: 1px solid var(--line); border-radius: 6px; font-size: 11px; }
.fonts { font-size: 14px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
caption { padding-bottom: 6px; color: var(--muted); text-align: left; }
th, td { padding: 4px 0; border-top: 1px solid var(--line); text-align: left; font-weight: 400; }
td { text-align: right; font-weight: 700; }
</style></head><body><header><h1>Mt Cottages: three brand options</h1><p>For the CEO's pick (issue #27). Each option is also rendered on the home page and Frederick Cottage, desktop and phone. Wordmarks use free fonts; nothing here is live.</p></header><div class="grid">${columns}</div></body></html>`;
}

test("option board: wordmarks, palettes, type and contrast side by side", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const missing = [];
  await serveFonts(page, missing);
  await page.route("**/__brand-board", (route) => route.fulfill({ status: 200, contentType: "text/html", body: boardHtml() }));
  await page.goto("/__brand-board");
  await page.evaluate(async () => { await document.fonts.ready; });
  expect(missing, "font files found").toEqual([]);
  await page.screenshot({ path: path.join(shotDir, "options-board.png"), fullPage: true });
  await context.close();
});
