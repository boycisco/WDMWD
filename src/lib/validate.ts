// SPDX-License-Identifier: AGPL-3.0-only
/**
 * EVM Validation utilities for WDMWD
 * Explicitly distinguishes valid Ethereum/Base addresses and transaction hashes
 * from arbitrary hexadecimal strings.
 */

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const EVM_TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;

export function isValidAddress(value?: string | null): boolean {
  if (!value) return false;
  return EVM_ADDRESS_REGEX.test(value.trim());
}

export function isValidTxHash(value?: string | null): boolean {
  if (!value) return false;
  return EVM_TX_HASH_REGEX.test(value.trim());
}

export function findEvmEntities(text: string): {
  addresses: string[];
  txHashes: string[];
} {
  if (!text) return { addresses: [], txHashes: [] };

  const addressMatches = text.match(/\b0x[a-fA-F0-9]{40}\b/g) || [];
  const txMatches = text.match(/\b0x[a-fA-F0-9]{64}\b/g) || [];

  return {
    addresses: Array.from(new Set(addressMatches)),
    txHashes: Array.from(new Set(txMatches)),
  };
}

export function validateMessagePayload(message: string): { valid: boolean; error?: string } {
  if (!message || message.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty.' };
  }
  if (message.length > 10000) {
    return { valid: false, error: 'Message exceeds maximum length of 10,000 characters.' };
  }
  // Check estimated byte size for 64KB network payload safety
  const byteSize = new Blob([message]).size;
  if (byteSize > 64 * 1024) {
    return { valid: false, error: 'Payload exceeds 64KB network limit.' };
  }
  return { valid: true };
}
