// SPDX-License-Identifier: AGPL-3.0-only
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { HealthCheckResponse } from '@/types/api';

export function useHealth(pollIntervalMs = 30000) {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshHealth = useCallback(async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve system health');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const runCheck = async () => {
      try {
        const data = await api.getHealth();
        if (mounted) {
          setHealth(data);
          setError(null);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to retrieve system health');
          setLoading(false);
        }
      }
    };

    runCheck();

    if (pollIntervalMs > 0) {
      const timer = setInterval(runCheck, pollIntervalMs);
      return () => {
        mounted = false;
        clearInterval(timer);
      };
    }

    return () => {
      mounted = false;
    };
  }, [pollIntervalMs]);

  return { health, loading, error, refreshHealth };
}
