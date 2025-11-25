/**
 * Hook for filtering and managing today's departures
 * Handles filtering departures for today and virtualization keying
 */

import { useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Departure } from '@/types';

const ESTIMATED_ROW_HEIGHT = 96;
const NOTICE_SAMPLE_SIZE = 50;

export interface UseDeparturesTodayOptions {
  departures: Departure[];
  currentTime: Date;
  containerRef: React.RefObject<HTMLDivElement>;
}

export interface UseDeparturesTodayResult {
  todaysDepartures: Departure[];
  noticeSample: Departure[];
  rowVirtualizer: ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>;
  virtualRows: ReturnType<ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>['getVirtualItems']>;
}

/**
 * Hook to filter departures for today and set up virtualization
 */
export function useDeparturesToday({
  departures,
  currentTime,
  containerRef,
}: UseDeparturesTodayOptions): UseDeparturesTodayResult {
  const [startOfTodayMs, endOfTodayMs] = useMemo(() => {
    const start = new Date(currentTime);
    start.setHours(0, 0, 0, 0);
    const end = new Date(currentTime);
    end.setHours(23, 59, 59, 999);
    return [start.getTime(), end.getTime()];
  }, [currentTime]);

  const todaysDepartures = useMemo(() => {
    if (!departures.length) {
      return [];
    }
    return departures.filter((departure) => {
      const departureTime = departure.departure?.expected || departure.departure?.aimed;
      if (!departureTime) {
        return false;
      }
      const departureTimestamp = new Date(departureTime).getTime();
      return departureTimestamp >= startOfTodayMs && departureTimestamp <= endOfTodayMs;
    });
  }, [departures, startOfTodayMs, endOfTodayMs]);

  const noticeSample = useMemo(
    () => todaysDepartures.slice(0, NOTICE_SAMPLE_SIZE),
    [todaysDepartures]
  );

  const rowVirtualizer = useVirtualizer<HTMLDivElement, Element>({
    count: todaysDepartures.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 8,
    getItemKey: (index) => {
      const departure = todaysDepartures[index];
      if (!departure) {
        return `departure-${index}`;
      }
      return (
        departure.trip_id ||
        `${departure.service_id}-${departure.station}-${departure.departure?.aimed || index}`
      );
    },
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  return {
    todaysDepartures,
    noticeSample,
    rowVirtualizer,
    virtualRows,
  };
}

