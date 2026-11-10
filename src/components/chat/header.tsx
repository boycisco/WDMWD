'use client';

import React from 'react';
import { Menu, MoreHorizontal } from 'lucide-react';
import { HealthCheckResponse } from '@/types/api';

interface HeaderProps {
  onToggleHistory: () => void;
  onOpenSettings: () => void;
  health: HealthCheckResponse | null;
  historyOpen: boolean;
}

export function Header({ onToggleHistory, onOpenSettings }: HeaderProps) {
  return (
    <header className="relative flex items-center justify-between px-4 py-4 sm:px-6 bg-transparent z-30 shrink-0">
      <button
        type="button"
        onClick={onToggleHistory}
        className="relative z-10 w-11 h-11 rounded-full bg-[#1C2938] flex items-center justify-center text-[#A0AEC0] active:scale-95 active:bg-[#253343] transition-transform cursor-pointer select-none"
        style={{
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-label="Toggle History"
      >
        <Menu className="w-5 h-5 pointer-events-none" />
      </button>

      <div className="flex items-center gap-2 select-none pointer-events-none">
        <span className="w-3 h-3 rounded-full bg-[#0052FF] shadow-[0_0_10px_#0052FF]" />
        <span className="font-heading font-bold text-lg tracking-tight text-[#F1F5F9]">
          WDMWD
        </span>
      </div>

      <button
        type="button"
        onClick={onOpenSettings}
        className="relative z-10 w-11 h-11 rounded-full bg-[#1C2938] flex items-center justify-center text-[#A0AEC0] active:scale-95 active:bg-[#253343] transition-transform cursor-pointer select-none"
        style={{
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-label="Open Settings"
      >
        <MoreHorizontal className="w-5 h-5 pointer-events-none" />
      </button>
    </header>
  );
}