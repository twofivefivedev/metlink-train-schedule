/**
 * Departure data processing service
 * Handles business logic for processing and organizing departure data
 */

import { WELLINGTON_STOPS } from '@/lib/constants';
import { logger } from './logger';
import type { Departure, DeparturesResponse } from '@/types';

/**
 * Check if a destination is Wellington
 */
function isWellingtonDestination(departure: Departure): boolean {
  const destination = departure.destination?.stop_id || '';
  // Normalize destination to handle platform variants (WELL1, WELL2 -> WELL)
  const normalizedDestination = destination.replace(/\d+$/, '').toUpperCase();
  return WELLINGTON_STOPS.some(stop => {
    const normalizedStop = stop.replace(/\d+$/, '').toUpperCase();
    return normalizedDestination === normalizedStop || destination.includes(stop);
  });
}

/**
 * Separate departures into inbound and outbound
 */
export function separateByDirection(departures: Departure[]): { inbound: Departure[]; outbound: Departure[] } {
  const inbound = departures.filter(dep => isWellingtonDestination(dep));
  const outbound = departures.filter(dep => !isWellingtonDestination(dep));

  logger.debug('Separated departures by direction', {
    total: departures.length,
    inbound: inbound.length,
    outbound: outbound.length,
  });

  return { inbound, outbound };
}

/**
 * Sort departures by departure time
 */
export function sortByDepartureTime(departures: Departure[]): Departure[] {
  return [...departures].sort((a, b) => {
    const timeA = new Date(a.departure?.expected || a.departure?.aimed || 0).getTime();
    const timeB = new Date(b.departure?.expected || b.departure?.aimed || 0).getTime();
    return timeA - timeB;
  });
}

/**
 * Process and organize departures from multiple stations
 */
export function processDepartures(stationResults: Departure[][]): DeparturesResponse {
  // Flatten all station results
  const allDepartures = stationResults.flat();

  // Sort by departure time
  const sorted = sortByDepartureTime(allDepartures);

  // Separate by direction
  const { inbound, outbound } = separateByDirection(sorted);

  return {
    inbound,
    outbound,
    total: allDepartures.length,
  };
}

