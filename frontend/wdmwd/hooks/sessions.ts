import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { ChatSession } from '@/types/api';

export function useSessions(initialSessionId: string | null = null) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getSessions();
      setSessions(data.sessions || []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const data = await api.getSessions();
        if (mounted) {
          setSessions(data.sessions || []);
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const selectSession = useCallback((sessionId: string | null) => {
    setActiveSessionId(sessionId);
  }, []);

  const createNewSession = useCallback(() => {
    setActiveSessionId(null);
  }, []);

  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await api.deleteSession(sessionId);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (activeSessionId === sessionId) {
          setActiveSessionId(null);
        }
        return true;
      } catch (err: unknown) {
        throw new Error(err instanceof Error ? err.message : 'Failed to delete conversation');
      }
    },
    [activeSessionId]
  );

  return {
    sessions,
    activeSessionId,
    loading,
    error,
    fetchSessions,
    selectSession,
    createNewSession,
    deleteSession,
  };
}
