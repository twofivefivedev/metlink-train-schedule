/**
 * Departure utility functions
 * Helper functions for processing and formatting departure data
 */

import { STATION_NAMES } from '@/lib/constants';
import type { Departure } from '@/types';

/**
 * Parse ISO 8601 duration to readable format
 */
export function parseDelay(duration: string | undefined | null): string | null {
  if (!duration || duration === 'PT0S') return null;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;

  const [, hours, minutes, seconds] = match;
  const parts: string[] = [];

  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds && !hours && !minutes) parts.push(`${seconds}s`);

  return parts.join(' ') || null;
}

/**
 * Format time string to readable format
 */
export function formatTime(timeString: string | undefined | null): string {
  if (!timeString) return '';

  const date = new Date(timeString);
  return date.toLocaleTimeString('en-NZ', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get display status for a departure
 */
export function getDepartureStatus(departure: Departure): {
  text: string;
  color: 'success' | 'warning' | 'destructive' | 'secondary';
  isRealTime: boolean;
} {
  const delay = parseDelay((departure as unknown as { delay?: string }).delay);
  const hasRealTime = (departure as unknown as { monitored?: boolean }).monitored && departure.departure?.expected;

  const status = (departure as unknown as { status?: string }).status;
  if (status === 'canceled' || status === 'cancelled') {
    return { text: 'Canceled', color: 'destructive', isRealTime: true };
  }

  if (status === 'delayed' || delay) {
    return { text: `Delayed ${delay || ''}`, color: 'warning', isRealTime: true };
  }

  if (hasRealTime) {
    return { text: 'On Time', color: 'success', isRealTime: true };
  }

  return { text: 'Scheduled', color: 'secondary', isRealTime: false };
}

/**
 * Get friendly station name
 */
export function getStationName(stopId: string | undefined): string {
  if (!stopId) return 'Unknown';
  return STATION_NAMES[stopId as keyof typeof STATION_NAMES] || stopId;
}

/**
 * Get route display text from destination
 */
export function getRouteText(departure: Departure): string {
  const destination = departure.destination?.name || '';

  if (destination.includes('Express')) {
    return 'Express';
  } else if (destination.includes('All stops')) {
    return 'All Stops';
  }

  return destination.replace(' - Express', '').replace(' - All stops', '');
}

/**
 * Check if service has bus replacement
 */
export function isBusReplacement(departure: Departure): boolean {
  if (!departure) return false;

  const destination = (departure.destination?.name || '').toLowerCase();
  const origin = ((departure as unknown as { origin?: { name?: string } }).origin?.name || '').toLowerCase();
  const tripId = ((departure as unknown as { trip_id?: string }).trip_id || '').toLowerCase();
  const operator = ((departure as unknown as { operator?: string }).operator || '').toLowerCase();
  const vehicleId = (departure as unknown as { vehicle_id?: string | number }).vehicle_id;

  return (
    destination.includes('bus') ||
    destination.includes('replacement') ||
    origin.includes('bus') ||
    origin.includes('replacement') ||
    tripId.includes('bus') ||
    tripId.includes('replacement') ||
    operator === 'bus' ||
    operator.includes('bus') ||
    (vehicleId !== undefined && vehicleId !== null && vehicleId.toString().includes('B'))
  );
}

/**
 * Get important notices for a departure
 */
export function getImportantNotices(departure: Departure): string | null {
  const notices: string[] = [];

  if (isBusReplacement(departure)) {
    notices.push('Bus replacement');
  }

  const delay = parseDelay((departure as unknown as { delay?: string }).delay);
  if (delay && (delay.includes('h') || (delay.includes('m') && parseInt(delay) >= 30))) {
    notices.push('Major delay');
  }

  const status = (departure as unknown as { status?: string }).status;
  if (status === 'canceled' || status === 'cancelled') {
    notices.push('Cancelled');
  }

  const wheelchairAccessible = (departure as unknown as { wheelchair_accessible?: boolean }).wheelchair_accessible;
  if (wheelchairAccessible === false) {
    notices.push('Limited access');
  }

  return notices.length > 0 ? notices.join(', ') : null;
}

/**
 * Calculate wait time until next departure
 * Returns minutes until the departure, or null if departure is in the past or cancelled
 */
export function calculateWaitTime(
  departure: Departure,
  currentTime: Date = new Date()
): {
  minutes: number | null;
  displayText: string;
} {
  const status = (departure as unknown as { status?: string }).status;
  if (status === 'canceled' || status === 'cancelled') {
    return { minutes: null, displayText: 'Cancelled' };
  }

  // Use expected time if available, otherwise use scheduled time
  const departureTime = departure.departure?.expected || departure.departure?.aimed;
  if (!departureTime) {
    return { minutes: null, displayText: 'Time unknown' };
  }

  const departureDate = new Date(departureTime);
  const diffMs = departureDate.getTime() - currentTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  // If departure is in the past, return null
  if (diffMinutes < 0) {
    return { minutes: null, displayText: 'Departed' };
  }

  // Format display text
  if (diffMinutes === 0) {
    return { minutes: 0, displayText: 'Now' };
  } else if (diffMinutes === 1) {
    return { minutes: 1, displayText: '1 minute' };
  } else {
    return { minutes: diffMinutes, displayText: `${diffMinutes} minutes` };
  }
}

