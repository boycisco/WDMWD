// SPDX-License-Identifier: AGPL-3.0-only
import { ToolName, EvidenceClassification } from '@/types/api';

export const TOOL_DISPLAY_NAMES: Record<string, string> = {
  wallet: 'Investigating wallet',
  transaction: 'Examining transaction',
  transfers: 'Reviewing asset movements',
  trace: 'Tracing fund movements',
  relations: 'Investigating address relationships',
  contracts: 'Inspecting contract interactions',
  patterns: 'Analyzing activity patterns',
  history: 'Reviewing conversation context',
};

export function getToolDisplayName(toolName: string): string {
  const normalized = toolName.toLowerCase().trim();
  return TOOL_DISPLAY_NAMES[normalized] || `Processing ${toolName}`;
}

export function truncateAddress(address: string, start = 6, end = 4): string {
  if (!address) return '';
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}…${address.slice(-end)}`;
}

export function truncateTxHash(hash: string, start = 8, end = 6): string {
  if (!hash) return '';
  if (hash.length <= start + end) return hash;
  return `${hash.slice(0, start)}…${hash.slice(-end)}`;
}

export function getBasescanAddressUrl(address: string): string {
  return `https://basescan.org/address/${encodeURIComponent(address)}`;
}

export function getBasescanTxUrl(txHash: string): string {
  return `https://basescan.org/tx/${encodeURIComponent(txHash)}`;
}

export function formatRelativeTime(dateInput: string | number | Date): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 30) return 'just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatTimeOnly(dateInput: string | number | Date): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function getClassificationColor(classification: EvidenceClassification) {
  switch (classification) {
    case 'confirmed':
      return {
        text: 'text-[#4ADE80]',
        bg: 'bg-[#122B1E]',
        border: 'border-[#4ADE80]/30',
        label: 'Confirmed',
        description: 'Directly observable onchain evidence',
      };
    case 'inferred':
      return {
        text: 'text-[#9B73F8]',
        bg: 'bg-[#231B45]',
        border: 'border-[#7A5AF8]/30',
        label: 'Inferred',
        description: 'Supported by observed activity & heuristics',
      };
    case 'unknown':
    default:
      return {
        text: 'text-[#A59DBF]',
        bg: 'bg-[#1B1635]',
        border: 'border-[#2D2548]',
        label: 'Unknown',
        description: 'Not established from available data',
      };
  }
}
