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
    <header className="relative flex items-center justify-between px-4 py-4 sm:px-6 bg-transparent z-40 shrink-0 pointer-events-auto">
      
      <button
        type="button"
        onClick={() => {
          console.log('=== MENU BUTTON CLICKED ===');
          onToggleHistory();
        }}
        onPointerDown={() => console.log('=== MENU POINTERDOWN ===')}
        onTouchStart={() => console.log('=== MENU TOUCHSTART ===')}
        className="relative z-40 w-12 h-12 rounded-full bg-[#1C2938] flex items-center justify-center text-[#A0AEC0] active:bg-[#253343] transition-colors cursor-pointer pointer-events-auto touch-manipulation"
        aria-label="Toggle History"
      >
        <Menu className="w-5 h-5 pointer-events-none" />
      </button>

      <div />

      <button
        type="button"
        onClick={() => {
          console.log('=== SETTINGS BUTTON CLICKED ===');
          onOpenSettings();
        }}
        onPointerDown={() => console.log('=== SETTINGS POINTERDOWN ===')}
        onTouchStart={() => console.log('=== SETTINGS TOUCHSTART ===')}
        className="relative z-40 w-12 h-12 rounded-full bg-[#1C2938] flex items-center justify-center text-[#A0AEC0] active:bg-[#253343] transition-colors cursor-pointer pointer-events-auto touch-manipulation"
        aria-label="Open Settings"
      >
        <MoreHorizontal className="w-5 h-5 pointer-events-none" />
      </button>
    </header>
  );
}