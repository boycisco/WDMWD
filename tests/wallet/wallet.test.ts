// SPDX-License-Identifier: AGPL-3.0-only
import { describe, expect, it } from "vitest";
import { ValidationError } from "@/core/errors";
import {
  isValidAddress,
  normalizeAddress,
  verifyChecksum,
} from "@/wallet/wallet";

describe("wallet — address validation", () => {
  it("accepts a well-formed lowercase address", () => {
    expect(isValidAddress("0x4200000000000000000000000000000000000010")).toBe(true);
  });

  it("rejects a short address", () => {
    expect(isValidAddress("0x420")).toBe(false);
  });

  it("rejects non-hex characters", () => {
    expect(isValidAddress("0xZZZ0000000000000000000000000000000000010")).toBe(false);
  });

  it("rejects missing 0x prefix", () => {
    expect(isValidAddress("4200000000000000000000000000000000000010")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isValidAddress(42)).toBe(false);
    expect(isValidAddress(null)).toBe(false);
    expect(isValidAddress(undefined)).toBe(false);
  });

  it("normalizeAddress returns lowercase", () => {
    expect(normalizeAddress("0x4200000000000000000000000000000000000010")).toBe(
      "0x4200000000000000000000000000000000000010",
    );
  });

  it("normalizeAddress throws ValidationError on invalid input", () => {
    expect(() => normalizeAddress("nope")).toThrow(ValidationError);
  });
});

describe("wallet — EIP-55 checksum", () => {
  it("accepts all-lowercase as valid", async () => {
    expect(
      await verifyChecksum("0x4200000000000000000000000000000000000010"),
    ).toBe(true);
  });

  it("accepts a known valid checksummed address (vitalik.eth)", async () => {
    expect(
      await verifyChecksum("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
    ).toBe(true);
  });

  it("rejects an invalid checksum (wrong case)", async () => {
    expect(
      await verifyChecksum("0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
    ).toBe(false);
  });

  it("returns false for non-address input", async () => {
    expect(await verifyChecksum("not-an-address")).toBe(false);
  });
});