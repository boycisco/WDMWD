'use client';
// SPDX-License-Identifier: AGPL-3.0-only

import React from 'react';
import { FileText, ArrowUpRight } from 'lucide-react';
import { EvidenceItem } from '@/types/api';
import { ClassificationBadge } from '@/components/ui/badge';

interface EvidenceItemProps {
  evidence: EvidenceItem;
  onClick: (evidence: EvidenceItem) => void;
}

export function EvidenceReferenceChip({ evidence, onClick }: EvidenceItemProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(evidence)}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0F172C] hover:bg-[#152244] border border-[#1E2945] hover:border-[#0052FF]/60 text-xs transition-all cursor-pointer text-left group shadow-sm hover:shadow-[0_0_14px_rgba(0,82,255,0.25)]"
      title={`Inspect Evidence: ${evidence.title || evidence.id}`}
    >
      <FileText className="w-3.5 h-3.5 text-[#0052FF] shrink-0" />
      <span className="font-medium text-[#F0F4FF] truncate max-w-[140px] sm:max-w-[200px]">
        {evidence.title || evidence.id}
      </span>
      <ClassificationBadge classification={evidence.classification} className="scale-90 origin-left" />
      <ArrowUpRight className="w-3 h-3 text-[#627299] group-hover:text-[#3888FF] transition-colors shrink-0" />
    </button>
  );
}
