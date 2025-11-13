/**
 * Alert utility functions
 * Detects alert conditions for departures based on user preferences
 */

import type { Departure } from '@/types';
import type { AlertPreferences, ScheduleConfig } from './favorites';
import { getImportantNotices, calculateWaitTime } from './departureUtils';
import { normalizeStationId } from '@/lib/constants';

export interface AlertCondition {
  type: 'delay' | 'cancellation' | 'approaching';
  departure: Departure;
  message: string;
}

/**
 * Check if a departure matches alert conditions for a config
 */
export function checkAlertConditions(
  departure: Departure,
  config: ScheduleConfig,
  alerts: AlertPreferences,
  currentTime: Date = new Date()
): AlertCondition | null {
  if (!alerts.enabled) {
    return null;
  }

  // Check if departure matches the config's station selection
  const departureStation = departure.station;
  if (!departureStation) {
    return null;
  }
  
  const matchesStation = config.selectedStations.includes(departureStation) ||
    (config.filters.selectedStation && departureStation === config.filters.selectedStation);
  
  if (!matchesStation) {
    return null;
  }

  // Check for cancellation
  if (alerts.notifyOnCancellation) {
    const status = (departure as unknown as { status?: string }).status;
    if (status === 'canceled' || status === 'cancelled') {
      return {
        type: 'cancellation',
        departure,
        message: `${config.name} has been cancelled`,
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
        message: `${config.name} has a major delay`,
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
        message: `${config.name} train is arriving in ${waitTime.displayText}`,
      };
    }
  }

  return null;
}

/**
 * Get all alerts for saved configurations
 */
export function getAlertsForConfigs(
  departures: Departure[],
  configs: ScheduleConfig[],
  alerts: AlertPreferences,
  currentTime: Date = new Date()
): AlertCondition[] {
  const alertConditions: AlertCondition[] = [];

  configs.forEach(config => {
    // Filter departures matching this config
    const matchingDepartures = departures.filter(dep => {
      const depStation = dep.station;
      if (!depStation) return false;
      
      const matchesStation = config.selectedStations.includes(depStation) ||
        (config.filters.selectedStation && depStation === config.filters.selectedStation);
      const matchesDirection = checkDirection(dep, config.direction);
      const matchesLine = dep.service_id === config.line;
      return matchesStation && matchesDirection && matchesLine;
    });

    // Check each matching departure for alert conditions
    matchingDepartures.forEach(departure => {
      const condition = checkAlertConditions(departure, config, alerts, currentTime);
      if (condition) {
        alertConditions.push(condition);
      }
    });
  });

  return alertConditions;
}

/**
 * Get all alerts for favorite routes (legacy - for backward compatibility)
 * @deprecated Use getAlertsForConfigs instead
 */
export function getAlertsForFavorites(
  departures: Departure[],
  favorites: any[],
  alerts: AlertPreferences,
  currentTime: Date = new Date()
): AlertCondition[] {
  // Legacy function - return empty array as old favorites are migrated to configs
  return [];
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

