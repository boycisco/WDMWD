'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Header } from './header';
import { EmptyState } from './empty';
import { MessageBubble } from './message';
import { Composer } from './composer';
import { HistoryDrawer } from './history';
import { EvidenceDrawer } from '@/components/evidence/drawer';
import { WalletInspector } from '@/components/wallet/inspect';
import { SettingsModal } from '@/components/settings/settings';
import { useHealth } from '@/hooks/health';
import { useSessions } from '@/hooks/sessions';
import { useChat } from '@/hooks/chat';
import { EvidenceItem } from '@/types/api';

export function ChatApp() {
  const { health } = useHealth();
  const {
    sessions,
    activeSessionId,
    selectSession,
    createNewSession,
    deleteSession,
    fetchSessions,
  } = useSessions();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inspectedEvidence, setInspectedEvidence] = useState<EvidenceItem | null>(null);
  const [inspectedAddress, setInspectedAddress] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    loadingHistory,
    isStreaming,
    error,
    sendMessage,
    stopGeneration,
  } = useChat({
    sessionId: activeSessionId,
    onSessionCreated: (newId) => {
      selectSession(newId);
      fetchSessions();
    },
    onSessionUpdated: () => {
      fetchSessions();
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSelectPrompt = (promptText: string) => {
    sendMessage(promptText);
  };

  const isEmpty = messages.length === 0 && !loadingHistory;

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-transparent text-[#F0F4FF] overflow-hidden">
      
      <Header
        onToggleHistory={() => setHistoryOpen(!historyOpen)}
        onOpenSettings={() => setSettingsOpen(true)}
        health={health}
        historyOpen={historyOpen}
      />

      <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col relative">
        <div className="w-full max-w-[850px] mx-auto flex-1 flex flex-col px-3 sm:px-6">
          {loadingHistory && !isStreaming ? (
            <div className="flex-1 flex items-center justify-center text-xs text-[#627299]">
              Loading conversation history...
            </div>
          ) : isEmpty ? (
            <EmptyState onSelectPrompt={handleSelectPrompt} />
          ) : (
            <div className="flex flex-col flex-1 py-4 sm:py-6 pb-10">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onInspectAddress={(addr) => setInspectedAddress(addr)}
                  onInspectEvidence={(ev) => setInspectedEvidence(ev)}
                />
              ))}
              <div ref={messagesEndRef} className="h-2" />
            </div>
          )}
        </div>
      </main>

      <Composer
        onSendMessage={sendMessage}
        onStopGeneration={stopGeneration}
        isStreaming={isStreaming}
      />

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => selectSession(id)}
        onNewChat={() => createNewSession()}
        onDeleteSession={deleteSession}
      />

      <EvidenceDrawer
        evidence={inspectedEvidence}
        onClose={() => setInspectedEvidence(null)}
      />

      <WalletInspector
        address={inspectedAddress}
        onClose={() => setInspectedAddress(null)}
        onSelectEvidence={(ev) => setInspectedEvidence(ev)}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}