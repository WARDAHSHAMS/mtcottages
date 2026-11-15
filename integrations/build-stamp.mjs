// Writes dist/build.json: the commit the published site was built from.
//
// WorldEnterpriseGroup/mtcottages#19: for most of an evening every gh-pages
// deploy was cancelled by the next push, and nothing noticed that the live site
// had stopped moving. The live site now names its own commit, so a post-deploy
// gate (scripts/check-live-build.py) can fail when mtcottages.com lags the
// branch. The commit is the checked-out HEAD, which is exactly what was built;
// the build fails rather than publish a site that cannot say what it is.
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SHA = /^[0-9a-f]{40}$/;

function headCommit() {
  let commit;
  try {
    commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    throw new Error(`build-stamp: cannot read the commit being built (${error instanceof Error ? error.message : String(error)})`);
  }
  if (!SHA.test(commit)) throw new Error(`build-stamp: git rev-parse HEAD returned ${JSON.stringify(commit)}, not a commit SHA`);
  return commit;
}

export default function buildStamp() {
  return {
    name: "mtcottages:build-stamp",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const commit = headCommit();
        const stamp = { commit, builtAt: new Date().toISOString() };
        try {
          await writeFile(path.join(fileURLToPath(dir), "build.json"), `${JSON.stringify(stamp)}\n`, "utf8");
        } catch (error) {
          throw new Error(`build-stamp: cannot write build.json (${error instanceof Error ? error.message : String(error)})`);
        }
        logger.info(`build.json records commit ${commit}`);
      },
    },
  };
}
