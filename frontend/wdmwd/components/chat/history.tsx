'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, MessageSquare } from 'lucide-react';
import { ChatSession } from '@/types/api';
import { formatRelativeTime } from '@/lib/format';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => Promise<boolean>;
}

export function HistoryDrawer({
  open,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}: HistoryDrawerProps) {
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteSession(sessionToDelete.id);
      setSessionToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-40 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md"
              onClick={onClose}
            />

            {/* Left slide drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-[320px] max-w-[85vw] sm:w-[330px] h-full bg-[#0E1426] border-r border-[#1E2945] p-4 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col z-10 font-sans"
            >
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1A2542]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#0052FF] shadow-[0_0_8px_#0052FF]" />
                  <span className="font-heading font-bold text-sm tracking-wider text-[#F0F4FF]">
                    WDMWD
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onNewChat();
                      onClose();
                    }}
                    className="p-1.5 rounded-xl text-[#F0F4FF] hover:bg-[#141E38] border border-transparent hover:border-[#2A3B66] transition-all flex items-center gap-1 text-xs font-medium cursor-pointer"
                    title="New Investigation"
                  >
                    <Plus className="w-4 h-4 text-[#0052FF]" />
                    <span>New</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-xl text-[#94A3C8] hover:text-[#F0F4FF] hover:bg-[#141E38] transition-colors cursor-pointer"
                    aria-label="Close History"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sessions List */}
              <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#627299] px-2 mb-1">
                  Recent Investigations
                </span>

                {sessions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#627299]">
                    No previous investigations.
                  </div>
                ) : (
                  sessions.map((session) => {
                    const isActive = session.id === activeSessionId;
                    return (
                      <div
                        key={session.id}
                        className={`group relative flex items-center justify-between rounded-xl p-2.5 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#122044] border border-[#0052FF]/50 text-[#F0F4FF] shadow-[0_0_15px_rgba(0,82,255,0.2)]'
                            : 'hover:bg-[#141E38]/60 text-[#94A3C8] hover:text-[#F0F4FF] border border-transparent'
                        }`}
                        onClick={() => {
                          onSelectSession(session.id);
                          onClose();
                        }}
                      >
                        <div className="flex items-start gap-2.5 min-w-0 pr-6">
                          <MessageSquare
                            className={`w-4 h-4 mt-0.5 shrink-0 ${
                              isActive ? 'text-[#0052FF]' : 'text-[#627299]'
                            }`}
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-medium text-[#F0F4FF] truncate leading-tight">
                              {session.title || 'Untitled Investigation'}
                            </h4>
                            <span className="text-[10px] text-[#627299] font-mono mt-0.5 block">
                              {formatRelativeTime(session.updatedAt)}
                            </span>
                          </div>
                        </div>

                        {/* Delete button (shows on hover or active) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSessionToDelete(session);
                          }}
                          className="opacity-70 sm:opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#627299] hover:text-[#F87171] hover:bg-[#F87171]/10 transition-all absolute right-2 top-2.5"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom footer button for New Chat */}
              <div className="pt-3 border-t border-[#1A2542]">
                <button
                  type="button"
                  onClick={() => {
                    onNewChat();
                    onClose();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#0052FF] to-[#3888FF] text-white text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_18px_rgba(0,82,255,0.4)] hover:brightness-110 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Start New Conversation</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog for Session Deletion */}
      <Dialog
        open={Boolean(sessionToDelete)}
        onClose={() => setSessionToDelete(null)}
        title="Delete Conversation"
        description="Are you sure you want to permanently delete this investigation? This action cannot be undone."
      >
        <div className="py-2">
          {sessionToDelete && (
            <p className="text-xs text-[#94A3C8] bg-[#090E1D] p-3 rounded-xl border border-[#1A2542] truncate font-mono">
              {sessionToDelete.title}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 mt-5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSessionToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
