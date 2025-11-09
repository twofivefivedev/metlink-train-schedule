/**
 * Custom hook for train schedule data
 * Manages fetching, state, and auto-refresh logic
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getWairarapaDepartures } from '@/lib/api/client';
import { REFRESH_INTERVALS } from '@/lib/constants';
import type { Departure, ApiResponse, DeparturesResponse } from '@/types';

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

export function useTrainSchedule(): UseTrainScheduleReturn {
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

  const fetchSchedule = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response: ApiResponse<DeparturesResponse> = await getWairarapaDepartures();
      
      if (response.data) {
        setDepartures({
          inbound: response.data.inbound || [],
          outbound: response.data.outbound || [],
        });
        setLastUpdated(new Date());
      }
    } catch (err) {
      setError({
        message: 'Failed to fetch train schedule. Please try again.',
        type: err instanceof Error ? err.name : 'FetchError',
        retry: () => fetchSchedule(false),
      });
      console.error('Error fetching schedule:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchSchedule(false);

    // Set up auto-refresh
    intervalRef.current = setInterval(() => {
      fetchSchedule(true);
    }, REFRESH_INTERVALS.DEFAULT);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchSchedule]);

  return {
    departures,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh: () => fetchSchedule(false),
  };
}

