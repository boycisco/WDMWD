// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Wallet primitives — address validation and normalization.
 *
 * No I/O. These are pure functions that every wallet-related module
 * relies on. Getting address validation right once means every
 * downstream module (activity, profile, trace) inherits the correctness.
 */

import type { Address } from "@/core/types";
import { ValidationError } from "@/core/errors";

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

/**
 * Returns true if `value` looks like an EVM address (0x + 40 hex chars).
 *
 * This does NOT verify EIP-55 checksum casing. For checksum
 * verification, use `verifyChecksum` below.
 */
export function isValidAddress(value: unknown): value is Address {
  return typeof value === "string" && ADDRESS_PATTERN.test(value);
}

/** Normalize a valid address to lowercase. Throws on invalid input. */
export function normalizeAddress(value: unknown): Address {
  if (!isValidAddress(value)) {
    throw new ValidationError(
      `Invalid EVM address: ${typeof value === "string" ? value.slice(0, 60) : "<non-string>"}`,
    );
  }
  return value.toLowerCase() as Address;
}

/**
 * EIP-55 checksum verification. Returns true for all-lowercase or
 * all-uppercase (both are "unchecked but valid" by convention), and
 * strictly verifies mixed-case inputs against the Keccak-256 hash.
 *
 * Digits (0-9) have no case distinction and are skipped — only
 * alphabetic hex chars (a-f / A-F) are checked. This matches the
 * reference EIP-55 implementation.
 */
export async function verifyChecksum(value: string): Promise<boolean> {
  if (!isValidAddress(value)) return false;
  const hexPart = value.slice(2);
  const isAllLower = hexPart === hexPart.toLowerCase();
  const isAllUpper = hexPart === hexPart.toUpperCase();
  if (isAllLower || isAllUpper) return true;

  const { keccak256, stringToHex } = await import("viem");
  const lower = hexPart.toLowerCase();
  // EIP-55: keccak256 of the ASCII bytes of the lowercase hex string.
  // stringToHex encodes the string as ASCII bytes (0x64 0x38 ...), which
  // keccak256 then hashes. hashHex is the resulting hash WITHOUT 0x.
  const hashHex = keccak256(stringToHex(lower)).slice(2);

  for (let i = 0; i < 40; i++) {
    const c = hexPart[i]!;
    if (c >= "0" && c <= "9") continue; // digits have no case
    const shouldBeUpper = parseInt(hashHex[i]!, 16) >= 8;
    const isUpper = c !== c.toLowerCase(); // letters only at this point
    if (shouldBeUpper !== isUpper) return false;
  }
  return true;
}