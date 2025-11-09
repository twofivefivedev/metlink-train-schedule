/**
 * Custom hook for train schedule data
 * Manages fetching, state, and auto-refresh logic
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getWairarapaDepartures } from '../services/apiService';
import { REFRESH_INTERVALS } from '../config/constants';

export function useTrainSchedule() {
  const [departures, setDepartures] = useState({ inbound: [], outbound: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const fetchSchedule = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await getWairarapaDepartures();

      setDepartures({
        inbound: data.inbound || [],
        outbound: data.outbound || [],
      });
      setLastUpdated(new Date());
    } catch (err) {
      setError({
        message: 'Failed to fetch train schedule. Please try again.',
        type: err.name || 'FetchError',
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

