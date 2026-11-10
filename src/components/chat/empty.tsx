'use client';

import React from 'react';
import { Search, Zap, GitBranch } from 'lucide-react';

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

export function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  const suggestions = [
    {
      icon: <Search className="w-4 h-4" />,
      title: "Investigate Wallet",
      prompt: "Investigate wallet 0x4200000000000000000000000000000000000010",
    },
    {
      icon: <Zap className="w-4 h-4" />,
      title: "Explain Transaction",
      prompt: "What happened in transaction 0x7553bfddd1a2afa57d71106d1ad1ef73a9afd63ea6f83b0c15c568f4ddc601ea?",
    },
    {
      icon: <GitBranch className="w-4 h-4" />,
      title: "Trace Funds",
      prompt: "Trace the fund movements for wallet 0x4200000000000000000000000000000000000010",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full max-w-[800px] mx-auto px-4 animate-in fade-in duration-500">
      
      {/* Widened max-w to prevent weird wrapping */}
      <h1 className="font-heading text-4xl sm:text-5xl font-bold text-[#F1F5F9] mb-4 text-center tracking-tight">
        What Did My Wallet Do?
      </h1>
      <p className="text-[#A0AEC0] text-base sm:text-lg text-center mb-10 max-w-3xl mx-auto leading-relaxed text-balance">
        Investigate any Base wallet or transaction using natural language.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-12">
        {suggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelectPrompt(s.prompt)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#253343] bg-[#111821]/50 backdrop-blur-sm text-sm font-medium text-[#A0AEC0] hover:text-[#F1F5F9] hover:bg-[#1C2938] hover:border-[#4169FF]/50 transition-all touch-manipulation active:scale-95"
          >
            {s.icon}
            {s.title}
          </button>
        ))}
      </div>
    </div>
  );
}