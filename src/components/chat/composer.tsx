'use client';
// SPDX-License-Identifier: AGPL-3.0-only

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

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${Math.max(newHeight, 44)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    <div className="w-full max-w-[800px] mx-auto px-3 sm:px-4 pb-4 sm:pb-6 shrink-0 z-20">
      
      {/* Disclaimer - Moved above the input box */}
      <p className="text-center text-[11px] text-[#627299] mb-2.5 font-sans">
        WDMWD can make mistakes. Check important info.
      </p>

      <div className="relative flex flex-col rounded-[24px] bg-[#141B30] border border-[#2A3B66] focus-within:border-[#4169FF]/60 focus-within:shadow-[0_0_20px_rgba(65,105,255,0.15)] transition-all shadow-lg p-2 sm:p-3">        
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about a wallet or transaction..."
          rows={1}
          disabled={disabled}
          maxLength={10500}
          // Changed from text-[15px] to text-[16px] to prevent iOS auto-zoom
          className="w-full bg-transparent text-[#F1F5F9] placeholder:text-[#718096] text-[16px] resize-none focus:outline-none px-2 sm:px-3 py-2.5 leading-relaxed font-sans max-h-[200px] min-h-[44px]"
        />

        <div className="flex items-center justify-between px-2 pb-1 mt-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1C2938]/80 border border-[#2A3B66]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0052FF] shadow-[0_0_6px_#0052FF]" />
              <span className="text-[11px] font-medium text-[#A0AEC0] tracking-wide">
                Base Mainnet
              </span>
            </div>
            {isNearLimit && (
              <span
                className={`text-[11px] font-mono ${
                  isOverLimit ? 'text-[#F17878] font-bold' : 'text-[#E6B45D]'
                }`}
              >
                {charCount}/10k
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className="w-10 h-10 rounded-full bg-[#F17878]/20 hover:bg-[#F17878]/30 text-[#F17878] border border-[#F17878]/30 flex items-center justify-center transition-colors touch-manipulation cursor-pointer"
                title="Stop generation"
              >
                <Square className="w-4 h-4 fill-current pointer-events-none" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSend}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors touch-manipulation ${
                  canSend
                    ? 'bg-[#F1F5F9] text-[#0B0F14] hover:bg-white cursor-pointer shadow-sm'
                    : 'bg-[#253343] text-[#718096] cursor-not-allowed'
                }`}
                title="Send message"
              >
                <ArrowUp className="w-5 h-5 pointer-events-none" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}