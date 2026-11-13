// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Node.js-only instrumentation logic.
 *
 * Runs migrations at startup, then registers SIGTERM/SIGINT handlers
 * for graceful shutdown. Loaded only in the Node.js runtime.
 */

async function bootstrap(): Promise<void> {
  // 1. Run migrations before any request is served.
  try {
    const { runMigrations } = await import("./store/migrate");
    runMigrations();
    console.log("[startup] migrations applied successfully");
  } catch (err) {
    console.error(
      "[startup] migration failed:",
      err instanceof Error ? err.message : err,
    );
    // Exit so Docker's restart policy handles it. Never serve a
    // broken schema.
    process.exit(1);
  }

  // 2. Register shutdown handlers.
  const shutdown = async (signal: string): Promise<void> => {
    try {
      const { getDb } = await import("./store/store");
      getDb().close();
      console.log(`[shutdown] received ${signal}, closed database`);
    } catch (err) {
      console.error(
        `[shutdown] error closing database:`,
        err instanceof Error ? err.message : err,
      );
    }
    process.exit(0);
  };

  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}

void bootstrap();

export {};