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
    <header className="flex items-center justify-between px-4 py-4 sm:px-6 bg-transparent z-20 shrink-0">
      {/* Left: Circular History Button */}
      <button
        type="button"
        onClick={onToggleHistory}
        className="w-11 h-11 rounded-full bg-[#1C2938]/80 backdrop-blur-md flex items-center justify-center text-[#A0AEC0] hover:text-[#F1F5F9] hover:bg-[#253343] transition-all touch-manipulation active:scale-95"
        title="Toggle History"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Center is intentionally empty for extreme minimalism */}

      {/* Right: Circular Settings Button */}
      <button
        type="button"
        onClick={onOpenSettings}
        className="w-11 h-11 rounded-full bg-[#1C2938]/80 backdrop-blur-md flex items-center justify-center text-[#A0AEC0] hover:text-[#F1F5F9] hover:bg-[#253343] transition-all touch-manipulation active:scale-95"
        title="Settings"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>
    </header>
  );
}