/**
 * Validation helpers built on Zod.
 *
 * Every external input — API request bodies, environment variables,
 * RPC responses, agent tool arguments — must be validated before it
 * reaches business logic. This module centralises the "parse or throw"
 * pattern so we never end up with subtly different error shapes across
 * modules.
 */

import { z } from "zod";
import { ValidationError } from "./errors";

export { z };

/**
 * Parse `input` against `schema`, returning the typed result.
 * Throws a `ValidationError` (HTTP 400) on failure.
 */
export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Invalid input", result.error.issues);
  }
  return result.data;
}

/**
 * Parse `input`, returning `undefined` on failure.
 * Useful when validation is exploratory (e.g. checking if a string is
 * a valid address without raising an error).
 */
export function tryParse<T>(
  schema: z.ZodType<T>,
  input: unknown,
): T | undefined {
  const result = schema.safeParse(input);
  return result.success ? result.data : undefined;
}