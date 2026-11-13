/**
 * Next.js instrumentation hook.
 *
 * Runs in BOTH Node.js and Edge runtimes. We only care about Node.js
 * (SQLite is a native module), so the whole entrypoint is a runtime
 * guard + dynamic import.
 *
 * The actual shutdown handler lives in `./instrumentation-node.ts`
 * and is loaded ONLY in Node.js, so Turbopack's Edge bundle never
 * statically analyzes `process.once` / `process.exit`.
 */

export async function register(): Promise<void> {
  console.log(
    "[instrumentation] register() invoked, runtime:",
    process.env.NEXT_RUNTIME,
  );
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
    console.log(
      "[instrumentation] node module loaded, SIGTERM handler registered",
    );
  }
}