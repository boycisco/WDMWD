'use client';

import React, { useRef, useEffect, useState } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { validateMessagePayload } from '@/lib/validate';

interface ComposerProps {
  onSendMessage: (text: string) => void;
  onStopGeneration: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function Composer({
  onSendMessage,
  onStopGeneration,
  isStreaming,
  disabled,
}: ComposerProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea height up to 180px
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 180);
    textarea.style.height = `${Math.max(newHeight, 44)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter sends the message
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
      return;
    }
  };

  const handleSubmit = () => {
    if (isStreaming) {
      onStopGeneration();
      return;
    }

    const trimmed = value.trim();
    const validation = validateMessagePayload(trimmed);
    if (!validation.valid || disabled) return;

    onSendMessage(trimmed);
    setValue('');

    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }
  };

  const charCount = value.length;
  const isNearLimit = charCount > 8000;
  const isOverLimit = charCount > 10000;
  const canSend = value.trim().length > 0 && !isOverLimit && !disabled;

  return (
    <div className="w-full max-w-[850px] mx-auto px-4 pb-4 sm:pb-6 pt-2">
      <div className="relative flex flex-col rounded-2xl bg-[#0E1426]/95 border border-[#1E2945] focus-within:border-[#0052FF] transition-all shadow-[0_12px_40px_rgba(0,0,0,0.65)] p-2.5">
        {/* Multiline textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about a wallet or transaction..."
          rows={1}
          disabled={disabled}
          maxLength={10500}
          className="w-full bg-transparent text-[#F0F4FF] placeholder:text-[#627299] text-sm resize-none focus:outline-none px-2 py-1.5 leading-relaxed font-sans max-h-[180px] min-h-[44px]"
        />

        {/* Footer controls inside composer */}
        <div className="flex items-center justify-between pt-1.5 px-1 border-t border-[#1A2542] mt-1">
          {/* Left badge indicator */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#080D1A] border border-[#1E2945] text-[10px] font-mono text-[#94A3C8] tracking-wider uppercase font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0052FF] shadow-[0_0_6px_#0052FF]" />
              BASE MAINNET
            </span>
            <span className="hidden sm:inline text-[10px] text-[#627299]">
              · Ctrl+Enter to send
            </span>
          </div>

          {/* Right: Character count feedback + Send/Stop button */}
          <div className="flex items-center gap-2">
            {isNearLimit && (
              <span
                className={`text-[11px] font-mono ${
                  isOverLimit ? 'text-[#F0F4FF] font-bold bg-[#F87171] px-1 rounded' : 'text-[#FBBF24]'
                }`}
              >
                {charCount}/10,000
              </span>
            )}

            {isStreaming ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className="h-8 w-8 rounded-xl bg-[#F87171]/20 hover:bg-[#F87171]/30 text-[#F87171] border border-[#F87171]/40 flex items-center justify-center transition-all cursor-pointer shadow-[0_0_12px_rgba(248,113,113,0.3)]"
                title="Stop generation"
                aria-label="Stop generation"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSend}
                className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  canSend
                    ? 'bg-gradient-to-r from-[#0052FF] to-[#3888FF] text-white shadow-[0_0_18px_rgba(0,82,255,0.55)] hover:brightness-110 active:scale-95'
                    : 'bg-[#121B32] text-[#627299] opacity-60 cursor-not-allowed border border-[#1E2945]'
                }`}
                title="Send message"
                aria-label="Send message"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
