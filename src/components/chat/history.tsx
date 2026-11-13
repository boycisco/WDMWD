'use client';
// SPDX-License-Identifier: AGPL-3.0-only

import React from 'react';
import { X, Plus, Trash2, MessageSquare } from 'lucide-react';
import { ChatSession } from '@/types/api';
import { formatRelativeTime } from '@/lib/format';

interface HistoryProps {
  open: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => Promise<boolean>;
}

export function HistoryDrawer({
  open,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}: HistoryProps) {
  return (
    <>
      {/* Backdrop Overlay - z-40 */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer Panel - z-50, covering the header */}
      <div
        className={`fixed top-0 left-0 h-[100dvh] w-[85vw] max-w-[320px] sm:w-[320px] bg-[#0B0F14] z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 shrink-0 border-b border-[#1E2945]/50">
          <h2 className="font-heading font-semibold text-lg text-[#F1F5F9]">
            History
          </h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onNewChat();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0052FF]/15 text-[#60A5FA] hover:bg-[#0052FF]/25 transition-colors text-xs font-medium touch-manipulation cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 pointer-events-none" />
              New
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-[#A0AEC0] hover:text-[#F1F5F9] hover:bg-[#1C2938] transition-colors touch-manipulation cursor-pointer"
            >
              <X className="w-5 h-5 pointer-events-none" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {sessions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center h-full text-center mt-20">
              <span className="text-sm text-[#627299]">No conversations yet.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                return (
                  <div
                    key={session.id}
                    onClick={() => {
                      onSelectSession(session.id);
                      onClose(); 
                    }}
                    className={`group flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-colors touch-manipulation ${
                      isActive
                        ? 'bg-[#1C2938] text-[#F1F5F9]'
                        : 'text-[#A0AEC0] hover:bg-[#111821] hover:text-[#F1F5F9]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MessageSquare className={`w-4 h-4 shrink-0 pointer-events-none ${isActive ? 'text-[#0052FF]' : 'text-[#627299]'}`} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate">
                          {session.title || 'New Conversation'}
                        </span>
                        <span className="text-[10px] text-[#627299] truncate mt-0.5">
                          {formatRelativeTime(session.updatedAt)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await onDeleteSession(session.id);
                      }}
                      className={`p-1.5 rounded-md text-[#627299] hover:text-[#F17878] hover:bg-[#F17878]/10 transition-all ${
                        isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      title="Delete conversation"
                    >
                      <Trash2 className="w-4 h-4 pointer-events-none" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}