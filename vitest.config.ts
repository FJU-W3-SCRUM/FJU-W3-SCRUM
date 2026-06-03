import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const rootUrl = new URL(".", import.meta.url);
const rootDir = fileURLToPath(rootUrl);

export default defineConfig({
  resolve: {
    preserveSymlinks: true,
    alias: [
      {
        find: /^@\//,
        replacement: rootUrl.href,
      },
    ],
  },
  test: {
    environment: "node",
  },
});