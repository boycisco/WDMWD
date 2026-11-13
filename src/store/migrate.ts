/**
 * Runtime migration runner.
 *
 * Uses drizzle-orm's built-in migrator (a production dependency),
 * not drizzle-kit (a dev tool). This lets the Docker image ship
 * without copying the full node_modules tree from the builder stage.
 *
 * Called from instrumentation-node.ts at startup, before the server
 * starts accepting requests.
 */

import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDb } from "./store";

export function runMigrations(): void {
  const db = getDb();
  migrate(db, { migrationsFolder: "./drizzle" });
}