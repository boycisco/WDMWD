// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Vitest global setup.
 *
 * Loads `.env` ONLY when `LIVE_TESTS=1`. Default `npm test` runs in an
 * isolated environment without any provider keys, per spec §15.
 *
 * `dotenv.config()` is synchronous, so by the time any test file's
 * imports are evaluated, `process.env` is fully populated.
 */

import { config as loadEnv } from "dotenv";

if (process.env.LIVE_TESTS === "1") {
  loadEnv({ quiet: true });
}