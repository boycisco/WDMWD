/**
 * Context resolution — extract addresses and tx hashes from prior
 * conversation, so the model can resolve "the second one" or "that
 * wallet" without the user repeating themselves (spec §8.4).
 *
 * Pure functions. No I/O. Easy to test.
 */

import type { Address, TxHash } from "@/core/types";
import type { Message } from "@/model/model";

export interface ContextRefs {
  /** Most recent first, deduplicated. */
  addresses: Address[];
  /** Most recent first, deduplicated. */
  transactions: TxHash[];
}

const ADDRESS_RE = /\b(0x[0-9a-fA-F]{40})\b/g;
const TX_HASH_RE = /\b(0x[0-9a-fA-F]{64})\b/g;

function extractFrom(text: string): { addresses: Address[]; transactions: TxHash[] } {
  const addresses: Address[] = [];
  const transactions: TxHash[] = [];

  // Tx hashes first (longer pattern) so we don't also pick up the
  // first 40 chars as an address.
  let m: RegExpExecArray | null;
  TX_HASH_RE.lastIndex = 0;
  while ((m = TX_HASH_RE.exec(text))) {
    transactions.push(m[1]!.toLowerCase() as TxHash);
  }
  const stripped = text.replace(TX_HASH_RE, "");
  ADDRESS_RE.lastIndex = 0;
  while ((m = ADDRESS_RE.exec(stripped))) {
    addresses.push(m[1]!.toLowerCase() as Address);
  }
  return { addresses, transactions };
}

/**
 * Extract ordered, deduplicated references from message history.
 * Most recent first. Only user and assistant turns are scanned — tool
 * results are excluded to avoid flooding the list with addresses the
 * user never explicitly saw.
 */
export function extractRefs(history: Message[]): ContextRefs {
  const seenAddr = new Set<string>();
  const seenTx = new Set<string>();
  const addresses: Address[] = [];
  const transactions: TxHash[] = [];

  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i]!;
    if (m.role !== "user" && m.role !== "assistant") continue;
    const { addresses: a, transactions: t } = extractFrom(m.content);
    for (const addr of a) {
      if (!seenAddr.has(addr)) {
        seenAddr.add(addr);
        addresses.push(addr);
      }
    }
    for (const tx of t) {
      if (!seenTx.has(tx)) {
        seenTx.add(tx);
        transactions.push(tx);
      }
    }
  }
  return { addresses, transactions };
}

/**
 * Render refs as a compact block for the system prompt.
 * Empty string when no refs — no wasted tokens.
 */
export function formatRefsForPrompt(refs: ContextRefs): string {
  if (refs.addresses.length === 0 && refs.transactions.length === 0) return "";
  const lines: string[] = [
    "## Resolved references from conversation (most recent first)",
  ];
  if (refs.addresses.length > 0) {
    lines.push("Addresses:");
    refs.addresses.forEach((a, i) => lines.push(`  ${i + 1}. ${a}`));
  }
  if (refs.transactions.length > 0) {
    lines.push("Transactions:");
    refs.transactions.forEach((t, i) => lines.push(`  ${i + 1}. ${t}`));
  }
  return lines.join("\n");
}