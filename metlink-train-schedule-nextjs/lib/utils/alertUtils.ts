/**
 * Alert utility functions
 * Detects alert conditions for departures based on user preferences
 */

import type { Departure } from '@/types';
import type { AlertPreferences, FavoriteRoute } from './favorites';
import { getImportantNotices, calculateWaitTime } from './departureUtils';
import { normalizeStationId } from '@/lib/constants';

export interface AlertCondition {
  type: 'delay' | 'cancellation' | 'approaching';
  departure: Departure;
  message: string;
}

/**
 * Check if a departure matches alert conditions
 */
export function checkAlertConditions(
  departure: Departure,
  favorite: FavoriteRoute,
  alerts: AlertPreferences,
  currentTime: Date = new Date()
): AlertCondition | null {
  if (!alerts.enabled) {
    return null;
  }

  // Check for cancellation
  if (alerts.notifyOnCancellation) {
    const status = (departure as unknown as { status?: string }).status;
    if (status === 'canceled' || status === 'cancelled') {
      return {
        type: 'cancellation',
        departure,
        message: `Your favorite route has been cancelled`,
      };
    }
  }

  // Check for major delay
  if (alerts.notifyOnDelay) {
    const notices = getImportantNotices(departure);
    if (notices && notices.includes('Major delay')) {
      return {
        type: 'delay',
        departure,
        message: `Your favorite route has a major delay`,
      };
    }
  }

  // Check if train is approaching
  if (alerts.notifyOnApproaching) {
    const waitTime = calculateWaitTime(departure, currentTime);
    if (waitTime.minutes !== null && waitTime.minutes <= alerts.approachingMinutes && waitTime.minutes >= 0) {
      return {
        type: 'approaching',
        departure,
        message: `Your train is arriving in ${waitTime.displayText}`,
      };
    }
  }

  return null;
}

/**
 * Get all alerts for favorite routes
 */
export function getAlertsForFavorites(
  departures: Departure[],
  favorites: FavoriteRoute[],
  alerts: AlertPreferences,
  currentTime: Date = new Date()
): AlertCondition[] {
  const alertConditions: AlertCondition[] = [];

  favorites.forEach(favorite => {
    // Filter departures matching this favorite
    const matchingDepartures = departures.filter(dep => {
      const matchesStation = dep.station === favorite.station;
      const matchesDirection = checkDirection(dep, favorite.direction);
      const matchesLine = dep.service_id === favorite.line;
      return matchesStation && matchesDirection && matchesLine;
    });

    // Check each matching departure for alert conditions
    matchingDepartures.forEach(departure => {
      const condition = checkAlertConditions(departure, favorite, alerts, currentTime);
      if (condition) {
        alertConditions.push(condition);
      }
    });
  });

  return alertConditions;
}

/**
 * Check if a departure matches a direction
 */
function checkDirection(departure: Departure, direction: 'inbound' | 'outbound'): boolean {
  const destination = departure.destination?.stop_id || '';
  // Normalize destination ID to handle platform numbers (e.g., WELL1 -> WELL)
  const normalizedDestination = normalizeStationId(destination);
  const isWellingtonBound = normalizedDestination === 'WELL';

  if (direction === 'inbound') {
    return isWellingtonBound;
  } else {
    return !isWellingtonBound;
  }
}

