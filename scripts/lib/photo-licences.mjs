// Photo-licence ledger rules (WorldEnterpriseGroup/mtcottages#47).
//
// Property photos come from the Mt Cottages portfolio under
// assets/images/cottages/ and need no ledger row. Any other image a guide uses
// (a stock or public-domain photo of a town, an employer, a map) must have a
// row in docs/marketing/photo-licences.csv naming its source, licence,
// attribution and the date it was cleared. These helpers are pure so
// scripts/tests/photo-licences.test.mjs can exercise them without a checkout.
import { posix } from "node:path";

export const LEDGER_PATH = "docs/marketing/photo-licences.csv";
export const LEDGER_HEADER = ["file", "source", "licence", "attribution", "date"];
export const PORTFOLIO_PREFIX = "assets/images/cottages/";
/** Licences a guide image may carry. "owner" means a photo the Mt Cottages team took and owns. */
export const ALLOWED_LICENCES = new Set(["owner", "CC0-1.0", "public-domain", "CC-BY-4.0", "CC-BY-SA-4.0", "Unsplash", "Pexels"]);
const IMAGE_EXT = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Splits one CSV line, honouring double-quoted fields with "" escapes. */
export function splitCsvLine(line) {
  const fields = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { fields.push(field); field = ""; }
    else field += char;
  }
  if (quoted) throw new Error(`unterminated quoted field in: ${line}`);
  fields.push(field);
  return fields.map((value) => value.trim());
}

/** Parses the ledger into rows plus any structural problems (header, field count, blanks, licence, date, duplicates). */
export function parseLedger(text) {
  const problems = [];
  const rows = [];
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return { rows, problems: [`${LEDGER_PATH} is empty; it needs the header ${LEDGER_HEADER.join(",")}`] };
  const header = splitCsvLine(lines[0]);
  if (header.join(",") !== LEDGER_HEADER.join(",")) problems.push(`${LEDGER_PATH}: header must be ${LEDGER_HEADER.join(",")}, not ${header.join(",")}`);
  const seen = new Set();
  lines.slice(1).forEach((line, offset) => {
    const where = `${LEDGER_PATH}:${offset + 2}`;
    let fields;
    try {
      fields = splitCsvLine(line);
    } catch (error) {
      problems.push(`${where}: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    if (fields.length !== LEDGER_HEADER.length) {
      problems.push(`${where}: expected ${LEDGER_HEADER.length} fields, found ${fields.length}`);
      return;
    }
    const [file, source, licence, attribution, date] = fields;
    const row = { file: posix.normalize(file), source, licence, attribution, date };
    for (const name of LEDGER_HEADER) if (!row[name]) problems.push(`${where}: ${name} is blank`);
    if (licence && !ALLOWED_LICENCES.has(licence)) problems.push(`${where}: licence "${licence}" is not one of ${[...ALLOWED_LICENCES].join(", ")}`);
    if (date && !ISO_DATE.test(date)) problems.push(`${where}: date "${date}" is not YYYY-MM-DD`);
    if (row.file.startsWith(PORTFOLIO_PREFIX)) problems.push(`${where}: ${row.file} is a portfolio photo and needs no ledger row`);
    if (seen.has(row.file)) problems.push(`${where}: ${row.file} is listed twice`);
    seen.add(row.file);
    rows.push(row);
  });
  return { rows, problems };
}

/** Image module specifiers imported by a source file (static imports and import()). */
export function imageImports(source) {
  const specifiers = [];
  const pattern = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/g;
  for (const match of source.matchAll(pattern)) {
    const specifier = match[1].split("?")[0];
    if (IMAGE_EXT.test(specifier)) specifiers.push(specifier);
  }
  return specifiers;
}

/** Repo-relative path of a relative import made from `fromFile` (itself repo-relative); null for packages and aliases. */
export function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  return posix.normalize(posix.join(posix.dirname(fromFile), specifier));
}

/**
 * Checks guide sources against the ledger.
 * @param {{ path: string, source: string }[]} sources repo-relative guide source files
 * @param {string} ledgerText contents of the ledger
 * @param {(path: string) => boolean} exists whether a repo-relative file exists
 * @returns {{ problems: string[], checked: string[] }}
 */
export function checkGuideImages(sources, ledgerText, exists) {
  const { rows, problems } = parseLedger(ledgerText);
  const ledger = new Map(rows.map((row) => [row.file, row]));
  const checked = [];
  for (const { path, source } of sources) {
    for (const specifier of imageImports(source)) {
      const resolved = resolveImport(path, specifier);
      if (resolved === null) {
        problems.push(`${path}: image import "${specifier}" must be a relative path so its licence can be checked`);
        continue;
      }
      if (resolved.startsWith(PORTFOLIO_PREFIX)) continue;
      checked.push(resolved);
      if (!ledger.has(resolved)) problems.push(`${path}: ${resolved} is not a portfolio photo and has no row in ${LEDGER_PATH}`);
    }
  }
  for (const row of rows) if (!exists(row.file)) problems.push(`${LEDGER_PATH}: ${row.file} does not exist; remove its row or restore the file`);
  return { problems, checked };
}
