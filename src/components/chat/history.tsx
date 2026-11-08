'use client';

import React from 'react';
import { X, SquarePen, Trash2, MessageSquare } from 'lucide-react';
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
      {/* Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-[280px] sm:w-[320px] bg-[#0B0F14] border-r border-[#1E2945] z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-5 shrink-0">
          <h2 className="font-heading font-bold text-xl text-[#F1F5F9] tracking-tight">
            WDMWD
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#A0AEC0] hover:text-[#F1F5F9] hover:bg-[#1C2938] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable History List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {sessions.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#627299]">
              No previous conversations.
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
                      onClose(); // Auto-close on mobile
                    }}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-[#1C2938] text-[#F1F5F9]'
                        : 'text-[#A0AEC0] hover:bg-[#111821] hover:text-[#F1F5F9]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0052FF]' : 'text-[#627299]'}`} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate">
                          {session.title || 'New Conversation'}
                        </span>
                        <span className="text-[10px] text-[#627299] truncate">
                          {formatRelativeTime(session.updatedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Delete Button (shows on hover or if active) */}
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
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Action Area */}
        <div className="p-4 border-t border-[#1E2945] bg-[#0B0F14] shrink-0">
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#0052FF] hover:bg-[#3888FF] text-white font-medium text-sm transition-all shadow-[0_4px_20px_rgba(0,82,255,0.25)] active:scale-[0.98]"
          >
            <SquarePen className="w-4 h-4" />
            New Chat
          </button>
        </div>
      </div>
    </>
  );
}