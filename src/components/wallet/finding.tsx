'use client';
// SPDX-License-Identifier: AGPL-3.0-only

import React from 'react';
import { WalletFinding } from '@/types/api';
import { ClassificationBadge, SeverityBadge } from '@/components/ui/badge';

interface FindingCardProps {
  finding: WalletFinding;
}

export function FindingCard({ finding }: FindingCardProps) {
  return (
    <div className="p-3.5 rounded-xl bg-[#090E1D] border border-[#1A2542] hover:border-[#2A3B66] transition-colors flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-xs text-[#F0F4FF]">{finding.title}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <SeverityBadge severity={finding.severity} />
          <ClassificationBadge classification={finding.classification} />
        </div>
      </div>
      <p className="text-xs text-[#94A3C8] leading-relaxed font-sans">
        {finding.description}
      </p>
    </div>
  );
}
