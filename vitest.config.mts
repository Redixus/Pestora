import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    test: {
      fileParallelism: false,
      testTimeout: 30_000,
      hookTimeout: 30_000,
    },
    resolve: {
      alias: {
        "server-only": fileURLToPath(new URL("./tests/server-only.ts", import.meta.url)),
        "@": fileURLToPath(new URL(".", import.meta.url)),
      },
    },
  };
});
