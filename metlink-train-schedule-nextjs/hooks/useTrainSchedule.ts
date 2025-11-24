/**
 * Custom hook for train schedule data
 * Manages fetching, state, and auto-refresh logic
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getLineDepartures } from '@/lib/api/client';
import { REFRESH_INTERVALS, DEFAULT_LINE } from '@/lib/constants';
import type { Departure, ApiResponse, DeparturesResponse } from '@/types';
import type { LineCode } from '@/lib/constants';

export interface StaleState {
  isStale: boolean;
  since: Date | null;
  source?: 'network' | 'cache';
  reason?: 'offline' | 'network-error' | 'cache-fallback';
  message?: string;
}

interface UseTrainScheduleReturn {
  departures: {
    inbound: Departure[];
    outbound: Departure[];
  };
  loading: boolean;
  refreshing: boolean;
  error: {
    message: string;
    type: string;
    retry: () => void;
  } | null;
  lastUpdated: Date | null;
  staleState: StaleState;
  refresh: () => void;
}

interface UseTrainScheduleOptions {
  line?: LineCode;
  stations?: string[];
  autoRefresh?: boolean; // Enable/disable automatic polling (default: true)
}

export function useTrainSchedule(options: UseTrainScheduleOptions = {}): UseTrainScheduleReturn {
  const { line = DEFAULT_LINE, stations, autoRefresh = true } = options;
  const [departures, setDepartures] = useState<{ inbound: Departure[]; outbound: Departure[] }>({
    inbound: [],
    outbound: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<{
    message: string;
    type: string;
    retry: () => void;
  } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const hasResolvedRef = useRef(false);
  const isOfflineRef = useRef(false);
  const lastUpdatedRef = useRef<Date | null>(null);
  const [staleState, setStaleState] = useState<StaleState>({
    isStale: false,
    since: null,
  });

  const persistLastUpdated = useCallback((date: Date) => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.setItem('departures:last-updated', date.toISOString());
    } catch {
      // Ignore storage errors
    }
  }, []);

  const resetStaleState = useCallback(() => {
    setStaleState({
      isStale: false,
      since: null,
    });
  }, []);

  const fetchSchedule = useCallback(
    async (background = false) => {
      const hasResolved = hasResolvedRef.current;
      try {
        if (!background && !hasResolved) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }
        setError(null);

        const response: ApiResponse<DeparturesResponse> = await getLineDepartures(line, stations);

        if (response.data) {
          setDepartures({
            inbound: response.data.inbound || [],
            outbound: response.data.outbound || [],
          });

          const resolvedAt = response.meta?.cachedAt ? new Date(response.meta.cachedAt) : new Date();
          setLastUpdated(resolvedAt);
          lastUpdatedRef.current = resolvedAt;
          persistLastUpdated(resolvedAt);
          hasResolvedRef.current = true;

          if (response.meta?.cacheStatus === 'stale') {
            setStaleState({
              isStale: true,
              since: resolvedAt,
              source: 'cache',
              reason: 'cache-fallback',
              message: 'Showing saved departures until we reconnect to Metlink.',
            });
          } else {
            resetStaleState();
          }
        } else if (!hasResolvedRef.current) {
          setDepartures({ inbound: [], outbound: [] });
        }
      } catch (err) {
        const normalizedError = err instanceof Error ? err : new Error(String(err));
        const offline = typeof navigator !== 'undefined' ? !navigator.onLine : isOfflineRef.current;

        if (!hasResolvedRef.current) {
          setError({
            message: 'Failed to fetch train schedule. Please try again.',
            type: normalizedError.name,
            retry: () => fetchSchedule(false),
          });
        } else {
          setStaleState((previous) => ({
            isStale: true,
            since: previous.since || lastUpdatedRef.current || new Date(),
            source: previous.source || 'cache',
            reason: offline ? 'offline' : 'network-error',
            message: offline
              ? 'Offline — showing the last departures we saved. We will update automatically once you are back online.'
              : 'Unable to reach Metlink — showing the last departures we saved.',
          }));
        }

        console.error('Error fetching schedule:', err);

        if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
          import('@sentry/nextjs')
            .then((Sentry) => {
              Sentry.captureException(normalizedError, {
                tags: {
                  component: 'useTrainSchedule',
                },
              });
            })
            .catch(() => {
              // Silently fail if Sentry is not available
            });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [line, stations, persistLastUpdated, resetStaleState]
  );

  // Keep offline state in sync so we can describe stale reasons accurately.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncStatus = () => {
      isOfflineRef.current = !navigator.onLine;
    };

    syncStatus();
    window.addEventListener('online', syncStatus);
    window.addEventListener('offline', syncStatus);

    return () => {
      window.removeEventListener('online', syncStatus);
      window.removeEventListener('offline', syncStatus);
    };
  }, []);

  // Handle visibility change to pause polling when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    setIsVisible(!document.hidden);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchSchedule(false);

    // Set up auto-refresh only if enabled
    if (autoRefresh) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Start polling - will only execute when tab is visible
      intervalRef.current = setInterval(() => {
        // Only poll if tab is visible
        if (isVisible) {
          fetchSchedule(true);
        }
      }, REFRESH_INTERVALS.DEFAULT);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchSchedule, autoRefresh, isVisible]);

  return {
    departures,
    loading,
    refreshing,
    error,
    lastUpdated,
    staleState,
    refresh: () => fetchSchedule(true),
  };
}

