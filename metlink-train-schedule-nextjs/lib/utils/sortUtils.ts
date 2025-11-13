/**
 * Sorting utilities for departures
 */

import type { Departure } from '@/types';

export type SortOption = 'time' | 'delay' | 'status' | 'station';
export type SortDirection = 'asc' | 'desc';

/**
 * Sort departures by time
 */
function sortByTime(a: Departure, b: Departure, direction: SortDirection): number {
  const timeA = a.departure?.expected || a.departure?.aimed || '';
  const timeB = b.departure?.expected || b.departure?.aimed || '';
  
  if (!timeA && !timeB) return 0;
  if (!timeA) return 1;
  if (!timeB) return -1;
  
  const dateA = new Date(timeA).getTime();
  const dateB = new Date(timeB).getTime();
  
  return direction === 'asc' ? dateA - dateB : dateB - dateA;
}

/**
 * Sort departures by delay
 */
function sortByDelay(a: Departure, b: Departure, direction: SortDirection): number {
  const parseDelay = (duration: string | undefined | null): number => {
    if (!duration || duration === 'PT0S') return 0;
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const [, hours, minutes] = match;
    return (parseInt(hours || '0', 10) * 60) + parseInt(minutes || '0', 10);
  };
  
  const delayA = parseDelay((a as unknown as { delay?: string }).delay);
  const delayB = parseDelay((b as unknown as { delay?: string }).delay);
  
  return direction === 'asc' ? delayA - delayB : delayB - delayA;
}

/**
 * Sort departures by status
 */
function sortByStatus(a: Departure, b: Departure, direction: SortDirection): number {
  const getStatusPriority = (departure: Departure): number => {
    const status = (departure as unknown as { status?: string }).status;
    if (status === 'canceled' || status === 'cancelled') return 0;
    if (status === 'delayed') return 1;
    if (departure.departure?.expected) return 2; // On time with real-time data
    return 3; // Scheduled
  };
  
  const priorityA = getStatusPriority(a);
  const priorityB = getStatusPriority(b);
  
  return direction === 'asc' ? priorityA - priorityB : priorityB - priorityA;
}

/**
 * Sort departures by station
 */
function sortByStation(a: Departure, b: Departure, direction: SortDirection): number {
  const stationA = a.station || '';
  const stationB = b.station || '';
  
  const comparison = stationA.localeCompare(stationB);
  return direction === 'asc' ? comparison : -comparison;
}

/**
 * Sort departures based on option and direction
 */
export function sortDepartures(
  departures: Departure[],
  option: SortOption,
  direction: SortDirection = 'asc'
): Departure[] {
  const sorted = [...departures];
  
  switch (option) {
    case 'time':
      return sorted.sort((a, b) => sortByTime(a, b, direction));
    case 'delay':
      return sorted.sort((a, b) => sortByDelay(a, b, direction));
    case 'status':
      return sorted.sort((a, b) => sortByStatus(a, b, direction));
    case 'station':
      return sorted.sort((a, b) => sortByStation(a, b, direction));
    default:
      return sorted;
  }
}


