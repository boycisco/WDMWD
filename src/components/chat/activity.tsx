'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
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
  const activeStep = steps.find((s) => s.status === 'active');
  const allCompleted = completedCount === steps.length;

  return (
    <div className="mb-4 rounded-xl border border-[#1E2945] bg-[#090E1D] overflow-hidden text-xs shadow-inner">
      {/* Header bar / collapsed view */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-[#141E38]/60 transition-colors text-left cursor-pointer"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {isStreaming && !allCompleted ? (
            <span className="w-2 h-2 rounded-full bg-[#0052FF] animate-pulse shadow-[0_0_8px_#0052FF] shrink-0" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-[#4ADE80] shadow-[0_0_6px_#4ADE80] shrink-0" />
          )}

          <div className="flex items-center gap-2 truncate">
            <span className="font-medium text-[#F0F4FF]">
              {isStreaming && activeStep
                ? getToolDisplayName(activeStep.tool)
                : 'Investigation Progress'}
            </span>
            <span className="text-[#627299] text-[11px] font-mono">
              ({completedCount}/{steps.length})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[#94A3C8] shrink-0">
          <span className="text-[11px] hidden sm:inline">
            {expanded ? 'Hide steps' : 'View steps'}
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Expanded step list */}
      {expanded && (
        <div className="px-3.5 pb-3 pt-1 border-t border-[#1A2542] flex flex-col gap-2">
          {steps.map((step, idx) => {
            const isCompleted = step.status === 'completed';
            const isActive = step.status === 'active';
            const isFailed = step.status === 'failed';
            const displayName = getToolDisplayName(step.tool);

            return (
              <div key={`${step.tool}-${idx}`} className="flex items-start gap-2.5 text-xs">
                {/* Step indicator symbol: ✓ (mint green), ● (Base Blue glow), ○ (muted) */}
                <div className="mt-0.5 shrink-0 flex items-center justify-center w-4 h-4">
                  {isCompleted && (
                    <Check className="w-3.5 h-3.5 text-[#4ADE80] drop-shadow-[0_0_4px_rgba(74,222,128,0.5)]" />
                  )}
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-[#0052FF] ring-2 ring-[#0052FF]/40 shadow-[0_0_8px_#0052FF]" />
                  )}
                  {isFailed && (
                    <span className="text-[#F87171] font-bold">×</span>
                  )}
                  {!isCompleted && !isActive && !isFailed && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#627299]/60" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium ${
                        isCompleted
                          ? 'text-[#F0F4FF]'
                          : isActive
                          ? 'text-[#60A5FA]'
                          : 'text-[#627299]'
                      }`}
                    >
                      {displayName}
                    </span>
                  </div>

                  {step.summary && (
                    <p className="text-[11px] text-[#94A3C8] mt-0.5 leading-relaxed font-mono">
                      {step.summary}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
