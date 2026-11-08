import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { ChatMessage, EvidenceItem, InvestigationStep } from '@/types/api';

interface UseChatProps {
  sessionId: string | null;
  onSessionCreated?: (sessionId: string) => void;
  onSessionUpdated?: () => void;
}

export function useChat({ sessionId, onSessionCreated, onSessionUpdated }: UseChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentSessionIdRef = useRef<string | null>(sessionId);

  // Keep currentSessionIdRef updated in an effect
  useEffect(() => {
    currentSessionIdRef.current = sessionId;
  }, [sessionId]);

  // Load message history when sessionId changes
  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      if (!sessionId) {
        await Promise.resolve();
        if (isMounted) {
          setMessages([]);
        }
        return;
      }

      setLoadingHistory(true);
      setError(null);

      try {
        const data = await api.getSession(sessionId);
        if (isMounted) {
          setMessages((prev) => {
            // Do NOT overwrite in-flight messages. When a new session is
            // created mid-stream, this effect re-runs because `sessionId`
            // changes. At that moment the server has only the user message
            // persisted (assistant is still streaming), so overwriting
            // would wipe out the in-flight assistant bubble and cause all
            // subsequent SSE events (deltas, evidence, complete) to be
            // dropped — the bubble would never appear.
            if (prev.some((m) => m.isStreaming)) {
              return prev;
            }
            return data.messages || [];
          });
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load conversation history.');
        }
      } finally {
        if (isMounted) {
          setLoadingHistory(false);
        }
      }
    };

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);

      setMessages((prev) => {
        if (prev.length === 0) return prev;
        const lastMsg = prev[prev.length - 1];
        if (lastMsg.role === 'assistant' && lastMsg.isStreaming) {
          return [
            ...prev.slice(0, -1),
            {
              ...lastMsg,
              isStreaming: false,
              content: lastMsg.content || '*(Generation stopped by user)*',
            },
          ];
        }
        return prev;
      });
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      const userMessageId = `usr-${Date.now()}`;
      const assistantMessageId = `asst-${Date.now()}`;
      const now = new Date().toISOString();

      const userMessage: ChatMessage = {
        id: userMessageId,
        role: 'user',
        content: trimmed,
        createdAt: now,
      };

      const initialAssistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        createdAt: now,
        steps: [],
        evidence: [],
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        await api.sendChatMessage(
          {
            message: trimmed,
            sessionId: currentSessionIdRef.current || undefined,
            chainId: 8453,
          },
          {
            onMessageStart: (data) => {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    id: data.id || last.id,
                  };
                }
                return updated;
              });

              if (!currentSessionIdRef.current && data.sessionId) {
                currentSessionIdRef.current = data.sessionId;
                onSessionCreated?.(data.sessionId);
              }
            },

            onInvestigationStart: (data) => {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  const initialSteps: InvestigationStep[] = (data.steps || []).map((tool) => ({
                    tool,
                    label: tool,
                    status: 'pending',
                  }));
                  updated[updated.length - 1] = {
                    ...last,
                    steps: initialSteps,
                  };
                }
                return updated;
              });
            },

            onToolStart: (data) => {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  const steps = [...(last.steps || [])];
                  const existingIdx = steps.findIndex((s) => s.tool === data.tool);
                  if (existingIdx >= 0) {
                    steps[existingIdx] = {
                      ...steps[existingIdx],
                      label: data.label || steps[existingIdx].label,
                      status: 'active',
                      startedAt: new Date().toISOString(),
                    };
                  } else {
                    steps.push({
                      tool: data.tool,
                      label: data.label || data.tool,
                      status: 'active',
                      startedAt: new Date().toISOString(),
                    });
                  }
                  updated[updated.length - 1] = { ...last, steps };
                }
                return updated;
              });
            },

            onToolResult: (data) => {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  const steps = [...(last.steps || [])];
                  const existingIdx = steps.findIndex((s) => s.tool === data.tool);
                  if (existingIdx >= 0) {
                    steps[existingIdx] = {
                      ...steps[existingIdx],
                      status: data.success ? 'completed' : 'failed',
                      summary: data.summary,
                      completedAt: new Date().toISOString(),
                    };
                  } else {
                    steps.push({
                      tool: data.tool,
                      label: data.tool,
                      status: data.success ? 'completed' : 'failed',
                      summary: data.summary,
                      completedAt: new Date().toISOString(),
                    });
                  }
                  updated[updated.length - 1] = { ...last, steps };
                }
                return updated;
              });
            },

            onEvidence: (data) => {
              if (!data.evidence) return;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  const evidenceList = [...(last.evidence || [])];
                  if (!evidenceList.some((e) => e.id === data.evidence.id)) {
                    evidenceList.push(data.evidence);
                  }
                  updated[updated.length - 1] = {
                    ...last,
                    evidence: evidenceList,
                  };
                }
                return updated;
              });
            },

            onMessageDelta: (data) => {
              if (!data.content) return;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    content: (last.content || '') + data.content,
                  };
                }
                return updated;
              });
            },

            onMessageComplete: (data) => {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    content: data.content || last.content,
                    isStreaming: false,
                  };
                }
                return updated;
              });
            },

            onError: (data) => {
              setError(data.message || 'An error occurred during response generation.');
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    isStreaming: false,
                    error: data.message,
                  };
                }
                return updated;
              });
            },

            onDone: (data) => {
              setIsStreaming(false);
              abortControllerRef.current = null;
              if (data.sessionId && !currentSessionIdRef.current) {
                currentSessionIdRef.current = data.sessionId;
                onSessionCreated?.(data.sessionId);
              }
              onSessionUpdated?.();
            },
          },
          controller.signal
        );
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          return;
        }
        const errorMsg = err instanceof Error ? err.message : 'Failed to send message.';
        setError(errorMsg);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              isStreaming: false,
              error: errorMsg,
            };
          }
          return updated;
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, onSessionCreated, onSessionUpdated]
  );

  return {
    messages,
    loadingHistory,
    isStreaming,
    error,
    sendMessage,
    stopGeneration,
  };
}
