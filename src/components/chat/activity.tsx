'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check, Loader2 } from 'lucide-react';
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
    <div className="mb-3 text-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-[#A0AEC0] hover:text-[#F1F5F9] transition-colors group cursor-pointer"
      >
        {isStreaming && !allCompleted ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#4169FF]" />
        ) : (
          <Check className="w-4 h-4 text-[#B7F36B]" />
        )}
        <span className="font-medium">
          {isStreaming && !allCompleted
            ? 'Investigating onchain data...'
            : `Investigated ${steps.length} source${steps.length > 1 ? 's' : ''}`}
        </span>
        <span className="text-xs text-[#718096] group-hover:text-[#A0AEC0] ml-1 flex items-center gap-1">
          {expanded ? 'Hide details' : 'Show details'}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 pl-6 flex flex-col gap-2 border-l border-[#253343]">
          {steps.map((step, idx) => (
            <div key={`${step.tool}-${idx}`} className="flex items-center gap-2 text-xs text-[#A0AEC0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B7F36B] opacity-50" />
              <span>{getToolDisplayName(step.tool)}</span>
              {step.summary && <span className="text-[#718096] truncate max-w-sm">— {step.summary}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}