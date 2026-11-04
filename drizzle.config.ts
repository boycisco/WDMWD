/**
 * Drizzle Kit configuration — used by `drizzle-kit generate` and
 * `drizzle-kit migrate`. Runs in a Node context outside Next.js, so
 * it reads `DATABASE_URL` directly from the environment (with a
 * development default) rather than importing `src/config/config.ts`.
 *
 * Must stay in sync with `config.database.url`. Changing one without
 * the other causes migrations to target the wrong file.
 */

import { defineConfig } from "drizzle-kit";

const raw = process.env.DATABASE_URL ?? "file:./data/wdmwd.db";
const url = raw.startsWith("file:") ? raw.slice("file:".length) : raw;

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/store/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  verbose: true,
  strict: true,
});