/**
 * Departure utility functions
 * Helper functions for processing and formatting departure data
 */

import { STATION_NAMES, normalizeStationId } from '@/lib/constants';
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
 * Calculate delay in minutes by comparing expected vs aimed times
 * Returns positive number if delayed, negative if early, 0 if on time
 */
function calculateDelayMinutes(departure: Departure): number | null {
  const aimed = departure.departure?.aimed;
  const expected = departure.departure?.expected;
  
  if (!aimed || !expected) {
    return null;
  }
  
  const aimedTime = new Date(aimed).getTime();
  const expectedTime = new Date(expected).getTime();
  const diffMs = expectedTime - aimedTime;
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  
  return diffMinutes;
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

  // Calculate delay from expected vs aimed times if both are available
  const calculatedDelayMinutes = calculateDelayMinutes(departure);

  // Check for delays - 5+ minutes is considered delayed
  // Priority: 1) status field, 2) delay field from API, 3) calculated delay from times
  if (status === 'delayed') {
    const delayText = delay || (calculatedDelayMinutes !== null && calculatedDelayMinutes >= 5 
      ? `${calculatedDelayMinutes}m` 
      : '');
    return { text: delayText ? `Delayed ${delayText}` : 'Delayed', color: 'warning', isRealTime: true };
  }
  
  // Check API delay field
  if (delay) {
    const minutesMatch = delay.match(/(\d+)m/);
    if (minutesMatch) {
      const minutes = parseInt(minutesMatch[1]);
      if (minutes >= 5) {
        return { text: `Delayed ${delay}`, color: 'warning', isRealTime: true };
      }
    }
    // Check for hours (any delay with hours is considered delayed)
    if (delay.includes('h')) {
      return { text: `Delayed ${delay}`, color: 'warning', isRealTime: true };
    }
  }

  // Check calculated delay from expected vs aimed times
  if (calculatedDelayMinutes !== null && calculatedDelayMinutes >= 5) {
    const delayText = calculatedDelayMinutes >= 60 
      ? `${Math.floor(calculatedDelayMinutes / 60)}h ${calculatedDelayMinutes % 60}m`
      : `${calculatedDelayMinutes}m`;
    return { text: `Delayed ${delayText}`, color: 'warning', isRealTime: true };
  }

  // If we have real-time data and no significant delay, show "On Time"
  // "On Time" means: real-time data available AND within ±2 minutes of scheduled time
  if (hasRealTime) {
    if (calculatedDelayMinutes !== null) {
      // If within ±2 minutes, consider it "On Time"
      if (Math.abs(calculatedDelayMinutes) <= 2) {
        return { text: 'On Time', color: 'success', isRealTime: true };
      }
      // If early by more than 2 minutes, still show "On Time" (early is good!)
      if (calculatedDelayMinutes < -2) {
        return { text: 'On Time', color: 'success', isRealTime: true };
      }
    } else {
      // No calculated delay but has real-time data - assume on time
    return { text: 'On Time', color: 'success', isRealTime: true };
    }
  }

  // "Scheduled" means: no real-time data available, showing scheduled time only
  return { text: 'Scheduled', color: 'secondary', isRealTime: false };
}

/**
 * Get friendly station name
 * Normalizes platform variants (e.g., WELL1 -> WELL) before lookup
 */
export function getStationName(stopId: string | undefined): string {
  if (!stopId) return 'Unknown';
  // Normalize station ID to handle platform variants (WELL1 -> WELL)
  const normalizedId = normalizeStationId(stopId);
  return STATION_NAMES[normalizedId as keyof typeof STATION_NAMES] || normalizedId;
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

  // Check for delays - use API delay field first, then calculated delay
  const delay = parseDelay((departure as unknown as { delay?: string }).delay);
  const calculatedDelayMinutes = calculateDelayMinutes(departure);
  
  let delayMinutes: number | null = null;
  
  // Extract minutes from API delay field if available
  if (delay) {
      const minutesMatch = delay.match(/(\d+)m/);
      if (minutesMatch) {
      delayMinutes = parseInt(minutesMatch[1]);
    } else if (delay.includes('h')) {
      // If hours are present, treat as major delay
      const hoursMatch = delay.match(/(\d+)h/);
      if (hoursMatch) {
        delayMinutes = parseInt(hoursMatch[1]) * 60;
      }
    }
  }
  
  // Use calculated delay if API delay not available
  if (delayMinutes === null && calculatedDelayMinutes !== null && calculatedDelayMinutes >= 5) {
    delayMinutes = calculatedDelayMinutes;
  }
  
  if (delayMinutes !== null && delayMinutes >= 5) {
        // 30+ minutes is major delay, 5-29 minutes is just delayed
    if (delayMinutes >= 30) {
          notices.push('Major delay');
    } else {
          notices.push('Delayed');
    }
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
 * Get status category for a departure
 * Returns the category type for styling purposes
 */
export type StatusCategory = 'normal' | 'cancelled' | 'delayed' | 'bus';

export function getStatusCategory(departure: Departure): StatusCategory {
  const status = (departure as unknown as { status?: string }).status;
  
  if (status === 'canceled' || status === 'cancelled') {
    return 'cancelled';
  }
  
  if (isBusReplacement(departure)) {
    return 'bus';
  }
  
  // Check if delayed: status is 'delayed' OR there's a delay of 5+ minutes
  if (status === 'delayed') {
    return 'delayed';
  }
  
  // Check API delay field
  const delay = parseDelay((departure as unknown as { delay?: string }).delay);
  if (delay) {
    const minutesMatch = delay.match(/(\d+)m/);
    if (minutesMatch) {
      const minutes = parseInt(minutesMatch[1]);
      if (minutes >= 5) {
        return 'delayed';
      }
    }
    // Check for hours (any delay with hours is considered delayed)
    if (delay.includes('h')) {
      return 'delayed';
    }
  }
  
  // Check calculated delay from expected vs aimed times
  const calculatedDelayMinutes = calculateDelayMinutes(departure);
  if (calculatedDelayMinutes !== null && calculatedDelayMinutes >= 5) {
    return 'delayed';
  }
  
  return 'normal';
}

/**
 * Get Tailwind text color classes for status categories
 */
export function getStatusColorClass(category: StatusCategory): string {
  switch (category) {
    case 'cancelled':
      return 'text-red-600 dark:text-red-400';
    case 'delayed':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'bus':
      return 'text-blue-600 dark:text-blue-400';
    case 'normal':
    default:
      return 'text-black dark:text-white';
  }
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

