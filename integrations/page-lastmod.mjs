// Per-page sitemap lastmod from content, not the build (WorldEnterpriseGroup/mtcottages#82).
//
// Google trusts lastmod only when it moves with the page's content. Stamping every
// URL with the build (or the HEAD commit) moved all 60 dates on every deploy, so the
// hint was ignored. Here each page's lastmod is the newest git commit date among the
// sources that page actually renders:
//
// * a home microsite page (/<town>/<home>/ and its tour, plan, amenities, location and
//   guide pages): its template, its own data module (src/data/homes/<id>.ts), the files
//   that module imports (its photos, shared rates), and its own rows of
//   _data/distances.json. That file holds every home, so its date is the commit that
//   last changed *this home's* slice of it, found by walking the file's history.
// * any other page: its .astro source (or the catch-all [...slug].astro) plus the data
//   modules and JSON it imports directly. Shared layout and components are chrome, not
//   page content, and do not move the date.
//
// Same commit in, same dates out: nothing here reads the clock unless a page has no
// traceable source, and that fallback is logged.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const DISTANCES = "_data/distances.json";
const HOME_TEMPLATE_INDEX = "src/pages/[town]/[home]/index.astro";
const HOME_TEMPLATE_PAGE = "src/pages/[town]/[home]/[page].astro";
const CATCH_ALL = "src/pages/[...slug].astro";
const HOME_PAGE = /^[a-z0-9-]+\.html$/;
// Value imports only: `import type` brings in no content.
const IMPORT = /^import\s+(?!type\b)[^;]*?\bfrom\s+["'](\.{1,2}\/[^"']+)["']/gm;
// Content lives in data modules, JSON and images; layout and components are chrome.
const CONTENT_ROOTS = ["src/data/", "_data/", "assets/"];

const toPosix = (value) => value.split(path.sep).join("/");
/** W3C datetime in UTC, so every lastmod reads the same way whatever the committer's zone. */
const utc = (date) => new Date(date).toISOString().replace(/\.000Z$/, "Z");
const errorText = (error) => (error instanceof Error ? error.message : String(error));

/** The newest of several ISO 8601 dates, as written (offsets kept). */
const newest = (dates) => dates.filter(Boolean).reduce((best, date) => (best === undefined || Date.parse(date) > Date.parse(best) ? date : best), undefined);

export class PageLastmod {
  /**
   * @param {{ root: string, logger?: { warn(message: string): void, info?(message: string): void },
   *           failOnShallow?: boolean, now?: () => Date }} options
   */
  constructor({ root, logger = console, failOnShallow = false, now = () => new Date() }) {
    this.root = root;
    this.logger = logger;
    this.now = now;
    this.cache = new Map();
    this.fallbacks = [];
    if (this.git(["rev-parse", "--is-shallow-repository"]) === "true") {
      const message = "the git clone is shallow, so every page would get the oldest fetched commit's date; fetch full history (actions/checkout fetch-depth: 0, GitLab GIT_DEPTH: 0)";
      if (failOnShallow) throw new Error(`page-lastmod: ${message}`);
      this.logger.warn(message);
    }
    this.homes = this.readHomes();
  }

  /** Runs git in the site root; returns trimmed stdout, or "" when git fails (logged). */
  git(args) {
    try {
      return execFileSync("git", ["-C", this.root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 }).trim();
    } catch (error) {
      this.logger.warn(`git ${args.join(" ")} failed: ${errorText(error)}`);
      return "";
    }
  }

  memo(key, compute) {
    if (!this.cache.has(key)) this.cache.set(key, compute());
    return this.cache.get(key);
  }

  /** Home microsites by URL base (/<town>/<slug>/), read from src/data/homes/<id>.ts. */
  readHomes() {
    const dir = path.join(this.root, "src/data/homes");
    const homes = new Map();
    if (!existsSync(dir)) return homes;
    for (const name of readdirSync(dir).sort()) {
      if (!name.endsWith(".ts")) continue;
      const file = `src/data/homes/${name}`;
      const source = readFileSync(path.join(this.root, file), "utf8");
      const id = source.match(/^ {2}id: "([^"]+)"/m)?.[1];
      const slug = source.match(/^ {2}slug: "([^"]+)"/m)?.[1];
      const town = source.match(/^ {2}town: \{[^}\n]*\bslug: "([^"]+)"/m)?.[1];
      if (id && slug && town) homes.set(`/${town}/${slug}/`, { id, file });
    }
    return homes;
  }

  /** Repo-relative content files a module imports directly (data modules, JSON, images). */
  contentImports(file, { followJson = false } = {}) {
    return this.memo(`imports:${file}:${followJson}`, () => {
      const full = path.join(this.root, file);
      let source;
      try {
        source = readFileSync(full, "utf8");
      } catch (error) {
        this.logger.warn(`cannot read ${file}: ${errorText(error)}`);
        return [];
      }
      const found = [];
      for (const [, spec] of source.matchAll(IMPORT)) {
        const target = this.resolve(path.dirname(full), spec);
        if (!target || !CONTENT_ROOTS.some((rootDir) => target.startsWith(rootDir))) continue;
        found.push(target);
        // A typed wrapper (src/data/distances.ts) renders the JSON it imports.
        if (followJson && target.endsWith(".ts")) found.push(...this.contentImports(target).filter((nested) => nested.endsWith(".json")));
      }
      return found;
    });
  }

  resolve(fromDir, spec) {
    const base = path.resolve(fromDir, spec);
    for (const candidate of [base, `${base}.ts`, `${base}.mjs`, `${base}.json`, path.join(base, "index.ts")]) {
      if (existsSync(candidate) && statSync(candidate).isFile()) return toPosix(path.relative(this.root, candidate));
    }
    return undefined;
  }

  /** Newest commit date touching any of the files, or undefined when none is committed. */
  filesDate(files) {
    const unique = [...new Set(files)].sort();
    if (unique.length === 0) return undefined;
    return this.memo(`files:${unique.join("\0")}`, () => this.git(["log", "-1", "--format=%cI", "--", ...unique]) || undefined);
  }

  /** One home's part of distances.json: its origin, its rows and what those rows cite. */
  static distanceSlice(data, homeId) {
    const origin = data?.microsites?.[homeId];
    if (!origin) return undefined;
    const rows = (data.rows ?? []).filter((row) => row.origin === origin);
    const pick = (table, keys) => [...new Set(keys)].sort().map((key) => [key, table?.[key] ?? null]);
    return JSON.stringify({
      origin: data.origins?.[origin] ?? null,
      rows,
      destinations: pick(data.destinations, rows.map((row) => row.destination)),
      sources: pick(data.sources, rows.map((row) => row.source).filter(Boolean)),
    });
  }

  /** The commit date of the last change to this home's distance slice. */
  distancesDate(homeId) {
    return this.memo(`distances:${homeId}`, () => {
      let current;
      try {
        current = PageLastmod.distanceSlice(JSON.parse(readFileSync(path.join(this.root, DISTANCES), "utf8")), homeId);
      } catch (error) {
        this.logger.warn(`cannot read ${DISTANCES}: ${errorText(error)}`);
        return undefined;
      }
      if (current === undefined) return undefined;
      const history = this.memo("distances:history", () =>
        this.git(["log", "--format=%H %cI", "--", DISTANCES]).split("\n").filter(Boolean).map((line) => line.split(" ")),
      );
      let introduced;
      for (const [sha, date] of history) {
        const old = this.memo(`distances:at:${sha}`, () => {
          const text = this.git(["show", `${sha}:${DISTANCES}`]);
          try {
            return text ? JSON.parse(text) : undefined;
          } catch {
            return undefined;
          }
        });
        // The slice looked different before this commit's successor: that successor introduced it.
        if (PageLastmod.distanceSlice(old, homeId) !== current) break;
        introduced = date;
      }
      return introduced;
    });
  }

  /** What a page renders: { files, homeId } for a site path such as "/" or "/parkersburg/oak-cottage/tour.html". */
  sourcesFor(pathname) {
    for (const [base, home] of this.homes) {
      if (!pathname.startsWith(base)) continue;
      const rest = pathname.slice(base.length);
      if (rest !== "" && rest !== "index.html" && !HOME_PAGE.test(rest)) continue;
      const template = rest === "" || rest === "index.html" ? HOME_TEMPLATE_INDEX : HOME_TEMPLATE_PAGE;
      // The home's distance rows are dated on their own below, not by the whole file.
      const files = [template, home.file, ...this.contentImports(home.file).filter((file) => file !== DISTANCES)];
      return { files, homeId: home.id };
    }
    const stem = pathname.endsWith("/") ? `${pathname}index` : pathname.replace(/\.html$/, "");
    for (const candidate of [`src/pages${stem}.astro`, `src/pages${stem}/index.astro`, CATCH_ALL]) {
      if (existsSync(path.join(this.root, candidate))) {
        return { files: [candidate, ...this.contentImports(candidate, { followJson: true })] };
      }
    }
    return { files: [] };
  }

  /** The page's lastmod: newest commit among its sources; logged fallbacks otherwise. */
  lastmod(pathname) {
    const { files, homeId } = this.sourcesFor(pathname);
    const date = newest([this.filesDate(files), homeId ? this.distancesDate(homeId) : undefined]);
    if (date) return utc(date);
    const head = this.memo("head", () => this.git(["log", "-1", "--format=%cI"]));
    this.fallbacks.push(pathname);
    if (head) {
      this.logger.warn(`${pathname}: no committed source found; using the HEAD commit date`);
      return utc(head);
    }
    this.logger.warn(`${pathname}: no git history; using the build time`);
    return utc(this.now());
  }
}
