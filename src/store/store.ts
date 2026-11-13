// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Database access layer.
 *
 * Provides a lazily-initialized Drizzle instance backed by
 * `better-sqlite3`. All application modules call `getDb()`; only
 * migrations touch the raw file path.
 *
 * Testability: `createDb(path)` is exported for tests (creates an
 * isolated DB against a temp file). `_resetForTests()` clears the
 * singleton — safe to call from tests, not from app code.
 */

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { config } from "@/config/config";
import * as schema from "./schema";

/**
 * Drizzle DB with a deterministic `close()`.
 *
 * Drizzle's BetterSQLite3Database does not expose the raw handle's
 * `close()` method in its public types (drizzle 0.45). We attach it
 * ourselves so tests can release file locks before deleting temp
 * dirs, and so the app can close cleanly during graceful shutdown.
 */
export type Db = BetterSQLite3Database<typeof schema> & {
  close: () => void;
};
export { schema };

function pathFromUrl(url: string): string {
  return url.startsWith("file:") ? url.slice("file:".length) : url;
}

export function createDb(path: string): Db {
  mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL"); // concurrent reads during writes
  sqlite.pragma("foreign_keys = ON"); // SQLite has FKs OFF by default
  sqlite.pragma("busy_timeout = 5000"); // wait up to 5s for locks
  const db = drizzle(sqlite, { schema });
  return Object.assign(db, { close: () => sqlite.close() });
}

let _db: Db | null = null;

export function getDb(): Db {
  if (!_db) {
    _db = createDb(pathFromUrl(config.database.url));
  }
  return _db;
}

/** Test-only hook. Never call from application code. */
export function _resetForTests(): void {
  _db = null;
}