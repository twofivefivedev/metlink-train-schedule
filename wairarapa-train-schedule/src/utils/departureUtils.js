/**
 * Departure utility functions
 * Helper functions for processing and formatting departure data
 */

import { STATION_NAMES } from '../config/constants';

/**
 * Parse ISO 8601 duration to readable format
 * @param {string} duration - ISO 8601 duration (e.g., "PT1H45M30S")
 * @returns {string|null} Readable delay (e.g., "1h 45m") or null
 */
export function parseDelay(duration) {
  if (!duration || duration === 'PT0S') return null;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;

  const [, hours, minutes, seconds] = match;
  const parts = [];

  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds && !hours && !minutes) parts.push(`${seconds}s`);

  return parts.join(' ') || null;
}

/**
 * Format time string to readable format
 * @param {string} timeString - ISO 8601 time string
 * @returns {string} Formatted time (e.g., "2:30 PM")
 */
export function formatTime(timeString) {
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
 * @param {Object} departure - Departure object from API
 * @returns {Object} { text, color, isRealTime }
 */
export function getDepartureStatus(departure) {
  const delay = parseDelay(departure.delay);
  const hasRealTime = departure.monitored && departure.departure?.expected;

  if (departure.status === 'canceled' || departure.status === 'cancelled') {
    return { text: 'Canceled', color: 'destructive', isRealTime: true };
  }

  if (departure.status === 'delayed' || delay) {
    return { text: `Delayed ${delay || ''}`, color: 'warning', isRealTime: true };
  }

  if (hasRealTime) {
    return { text: 'On Time', color: 'success', isRealTime: true };
  }

  return { text: 'Scheduled', color: 'secondary', isRealTime: false };
}

/**
 * Get friendly station name
 * @param {string} stopId - Station ID
 * @returns {string} Display name
 */
export function getStationName(stopId) {
  return STATION_NAMES[stopId] || stopId;
}

/**
 * Get route display text from destination
 * @param {Object} departure - Departure object
 * @returns {string} Route description
 */
export function getRouteText(departure) {
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
 * @param {Object} departure - Departure object
 * @returns {boolean} True if bus replacement
 */
export function isBusReplacement(departure) {
  if (!departure) return false;

  const destination = (departure.destination?.name || '').toLowerCase();
  const origin = (departure.origin?.name || '').toLowerCase();
  const tripId = (departure.trip_id || '').toLowerCase();
  const operator = (departure.operator || '').toLowerCase();

  return (
    destination.includes('bus') ||
    destination.includes('replacement') ||
    origin.includes('bus') ||
    origin.includes('replacement') ||
    tripId.includes('bus') ||
    tripId.includes('replacement') ||
    operator === 'bus' ||
    operator.includes('bus') ||
    (departure.vehicle_id && departure.vehicle_id.toString().includes('B'))
  );
}

/**
 * Get important notices for a departure
 * @param {Object} departure - Departure object
 * @returns {string|null} Notice text or null
 */
export function getImportantNotices(departure) {
  const notices = [];

  if (isBusReplacement(departure)) {
    notices.push('Bus replacement');
  }

  if (departure.delay) {
    const delay = parseDelay(departure.delay);
    if (delay && (delay.includes('h') || (delay.includes('m') && parseInt(delay) >= 30))) {
      notices.push('Major delay');
    }
  }

  if (departure.status === 'canceled' || departure.status === 'cancelled') {
    notices.push('Cancelled');
  }

  if (departure.wheelchair_accessible === false) {
    notices.push('Limited access');
  }

  return notices.length > 0 ? notices.join(', ') : null;
}

