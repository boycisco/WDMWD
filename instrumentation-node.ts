/**
 * Node.js-only instrumentation logic.
 *
 * This module is dynamically imported by `./instrumentation.ts` only
 * when running in the Node.js runtime. It MUST NOT be imported
 * statically anywhere, or Turbopack's Edge bundle analysis will
 * reject the Node.js APIs it uses.
 *
 * Purpose: close the SQLite connection cleanly on SIGTERM/SIGINT so
 * Docker's `stop_grace_period` (default 15s) has time for a graceful
 * shutdown before SIGKILL.
 */

const shutdown = async (signal: string): Promise<void> => {
  try {
    const { getDb } = await import("@/store/store");
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

export {};