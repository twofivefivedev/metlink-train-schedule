/**
 * Custom hook for train schedule data
 * Manages fetching, state, and auto-refresh logic
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getLineDepartures } from '@/lib/api/client';
import { REFRESH_INTERVALS, DEFAULT_LINE } from '@/lib/constants';
import type { Departure, ApiResponse, DeparturesResponse } from '@/types';
import type { LineCode } from '@/lib/constants';

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

  const fetchSchedule = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response: ApiResponse<DeparturesResponse> = await getLineDepartures(line, stations);
      
      if (response.data) {
        setDepartures({
          inbound: response.data.inbound || [],
          outbound: response.data.outbound || [],
        });
        setLastUpdated(new Date());
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError({
        message: 'Failed to fetch train schedule. Please try again.',
        type: error.name,
        retry: () => fetchSchedule(false),
      });
      console.error('Error fetching schedule:', err);
      
      // Report to Sentry in production
      if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
        import('@sentry/nextjs').then((Sentry) => {
          Sentry.captureException(error, {
            tags: {
              component: 'useTrainSchedule',
            },
          });
        }).catch(() => {
          // Silently fail if Sentry is not available
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [line, stations]);

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
  }, [fetchSchedule, line, stations, autoRefresh, isVisible]);

  return {
    departures,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh: () => fetchSchedule(false),
  };
}

