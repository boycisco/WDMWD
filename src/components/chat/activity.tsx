'use client';
// SPDX-License-Identifier: AGPL-3.0-only

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check, Loader2, Search } from 'lucide-react';
import { InvestigationStep } from '@/types/api';
import { getToolDisplayName } from '@/lib/format';

interface ActivityProps {
  steps?: InvestigationStep[];
  isStreaming?: boolean;
}

export function InvestigationActivity({ steps = [], isStreaming }: ActivityProps) {
  const [expanded, setExpanded] = useState(false);

  if (!steps || steps.length === 0) return null;

  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const allCompleted = completedCount === steps.length;

  return (
    <div className="mb-4 text-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-[#A0AEC0] hover:text-[#F1F5F9] transition-colors group cursor-pointer"
      >
        {isStreaming && !allCompleted ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#0052FF]" />
        ) : (
          <Check className="w-4 h-4 text-[#4ADE80]" />
        )}
        <span className="font-medium">
          {isStreaming && !allCompleted
            ? 'Investigating onchain data...'
            : `Investigation complete`}
        </span>
        <span className="text-xs text-[#627299] group-hover:text-[#A0AEC0] ml-1 flex items-center gap-1">
          {expanded ? 'Hide details' : 'Show details'}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 pl-3 flex flex-col gap-3 border-l-2 border-[#1E2945]">
          {steps.map((step, idx) => (
            <div key={`${step.tool}-${idx}`} className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs">
                <Search className="w-3.5 h-3.5 text-[#60A5FA]" />
                <span className="font-medium text-[#F1F5F9]">
                  {getToolDisplayName(step.tool)}
                </span>
                <span className="text-[#4ADE80] text-[10px] uppercase tracking-wider font-mono bg-[#4ADE80]/10 px-1.5 py-0.5 rounded">
                  {step.status}
                </span>
              </div>
              {step.summary && (
                <p className="text-xs text-[#A0AEC0] pl-5 leading-relaxed font-mono">
                  {step.summary}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}