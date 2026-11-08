import React from 'react';
import { clsx } from 'clsx';
import { EvidenceClassification } from '@/types/api';

interface ClassificationBadgeProps {
  classification: EvidenceClassification;
  className?: string;
}

export function ClassificationBadge({ classification, className }: ClassificationBadgeProps) {
  if (classification === 'confirmed') {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium tracking-tight rounded-md bg-[#122B1E] text-[#4ADE80] border border-[#4ADE80]/30 shadow-[0_0_8px_rgba(74,222,128,0.15)]',
          className
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] shadow-[0_0_6px_#4ADE80]" />
        Confirmed
      </span>
    );
  }

  if (classification === 'inferred') {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium tracking-tight rounded-md bg-[#102148] text-[#60A5FA] border border-[#0052FF]/35 shadow-[0_0_10px_rgba(0,82,255,0.2)]',
          className
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#0052FF] shadow-[0_0_6px_#0052FF]" />
        Inferred
      </span>
    );
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium tracking-tight rounded-md bg-[#141B30] text-[#94A3C8] border border-[#1E2945]',
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#627299]" />
      Unknown
    </span>
  );
}

interface SeverityBadgeProps {
  severity: 'high' | 'medium' | 'low' | 'info';
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const styles = {
    high: 'text-[#F87171] bg-[#2E1520] border-[#F87171]/30 shadow-[0_0_6px_rgba(248,113,113,0.15)]',
    medium: 'text-[#FBBF24] bg-[#2B2312] border-[#FBBF24]/30 shadow-[0_0_6px_rgba(251,191,36,0.15)]',
    low: 'text-[#4ADE80] bg-[#122B1E] border-[#4ADE80]/30 shadow-[0_0_6px_rgba(74,222,128,0.15)]',
    info: 'text-[#60A5FA] bg-[#102148] border-[#0052FF]/30 shadow-[0_0_8px_rgba(0,82,255,0.2)]',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-1.5 py-0.5 text-[10px] uppercase font-mono font-medium rounded-md border',
        styles[severity],
        className
      )}
    >
      {severity}
    </span>
  );
}
