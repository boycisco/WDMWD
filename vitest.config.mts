/**
 * Vitest configuration.
 *
 * - Node environment (backend only; no DOM).
 * - Tests live in `tests/`, mirroring `src/` structure.
 * - `@/*` alias mirrors `tsconfig.json` so tests can import the same
 *   paths the application uses.
 * - Coverage excludes the `app/` directory (API routes are exercised
 *   end-to-end via integration tests, not unit-tested here).
 */

import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", ".next", "dist", "**/*.d.ts"],
    globals: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/app/**", "src/**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
    },
  },
});