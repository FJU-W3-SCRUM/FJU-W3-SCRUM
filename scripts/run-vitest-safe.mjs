import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const tempRoot = "/private/tmp/fju-w3-scrum-vitest";

const syncResult = spawnSync(
  "rsync",
  [
    "-a",
    "--delete",
    "--exclude",
    ".git",
    "--exclude",
    ".next",
    `${repoRoot}/`,
    `${tempRoot}/`,
  ],
  { stdio: "inherit" },
);

if (syncResult.status !== 0) {
  process.exit(syncResult.status ?? 1);
}

const vitestResult = spawnSync(
  process.execPath,
  ["node_modules/vitest/vitest.mjs", "--run"],
  {
    cwd: tempRoot,
    stdio: "inherit",
  },
);

process.exit(vitestResult.status ?? 1);