import { spawnSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const tempRoot = "/private/tmp/fju-w3-scrum-dev";

rmSync(tempRoot, { recursive: true, force: true });

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

const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack"], {
  cwd: tempRoot,
  stdio: "inherit",
  env: {
    ...process.env,
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});