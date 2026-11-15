#!/usr/bin/env node
// Structured-data gate (#22): sends each page type's HTML to the schema.org
// validator (validator.schema.org, the Google-run successor of the Structured
// Data Testing Tool) and fails when it reports any error.
// The HTML is posted, not the URL, so it also checks a local build:
//   BASE_URL=http://127.0.0.1:4173 node scripts/validate-schema.mjs
// SCHEMA_PAGES=/a,/b overrides the page list; SCHEMA_REPORT=<file> writes the
// per-page result as JSON (CI keeps it as evidence).
import { writeFile } from "node:fs/promises";

const base = (process.env.BASE_URL || "https://mtcottages.com").replace(/\/+$/, "");
const validator = "https://validator.schema.org/validate";
// One page per JSON-LD shape: business only, street-level home, town-level home, home sub-page, town guide.
const pages = (process.env.SCHEMA_PAGES || "/,/marietta/frederick/,/parkersburg/buck-cottage/,/ravenswood/virginia-cottage/tour.html,/parkersburg/index.html,/marietta/index.html")
  .split(",").map((page) => page.trim()).filter(Boolean);
const attempts = 3;

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchText(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${init?.method ?? "GET"} ${url}: HTTP ${response.status}`);
  return response.text();
}

/** The validator answers with an XSSI guard line (")]}'") before the JSON. */
function parseValidatorResponse(text) {
  const json = text.replace(/^\)\]\}'\s*/, "");
  try {
    return JSON.parse(json);
  } catch (error) {
    throw new Error(`validator response is not JSON (${error.message}): ${text.slice(0, 200)}`);
  }
}

async function validate(path) {
  const html = await fetchText(`${base}${path}`);
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const body = new URLSearchParams({ html });
      const result = parseValidatorResponse(await fetchText(validator, { method: "POST", body }));
      if (typeof result.totalNumErrors !== "number") {
        throw new Error(`unexpected validator response shape; keys: ${Object.keys(result).join(", ")}`);
      }
      const types = (result.tripleGroups ?? []).map((group) => group.type).filter(Boolean);
      const errors = (result.tripleGroups ?? []).flatMap((group) => (group.nodes ?? []).flatMap((node) => (node.errors ?? []).map((error) => `${group.type}: ${JSON.stringify(error)}`)));
      return { path, errors: result.totalNumErrors, warnings: result.totalNumWarnings ?? 0, objects: result.numObjects ?? types.length, types, details: errors };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await pause(2000 * attempt);
    }
  }
  throw new Error(`${path}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

const results = [];
let failed = false;
for (const path of pages) {
  try {
    const result = await validate(path);
    results.push(result);
    const line = `${path}: ${result.errors} errors, ${result.warnings} warnings, ${result.objects} objects [${result.types.join(", ")}]`;
    if (result.errors > 0 || result.objects === 0) {
      failed = true;
      console.error(`FAIL ${line}`);
      for (const detail of result.details) console.error(`  ${detail}`);
    } else {
      console.log(`ok   ${line}`);
    }
  } catch (error) {
    failed = true;
    results.push({ path, error: error instanceof Error ? error.message : String(error) });
    console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (process.env.SCHEMA_REPORT) {
  try {
    await writeFile(process.env.SCHEMA_REPORT, `${JSON.stringify({ base, validator, results }, null, 2)}\n`);
  } catch (error) {
    console.error(`could not write ${process.env.SCHEMA_REPORT}: ${error instanceof Error ? error.message : String(error)}`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log(`validator.schema.org found no errors on ${results.length} pages`);
