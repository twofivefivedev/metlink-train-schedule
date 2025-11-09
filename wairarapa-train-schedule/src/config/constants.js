/**
 * Application constants
 * Centralized location for all constants
 */

// Station codes
export const STATIONS = {
  WELLINGTON: 'WELL',
  PETONE: 'PETO',
  FEATHERSTON: 'FEAT',
};

// Station display names
export const STATION_NAMES = {
  WELL: 'Wellington',
  PETO: 'Petone',
  FEAT: 'Featherston',
};

// Service IDs
export const SERVICE_IDS = {
  WAIRARAPA_LINE: 'WRL',
};

// Refresh intervals (in milliseconds)
export const REFRESH_INTERVALS = {
  DEFAULT: 2 * 60 * 1000, // 2 minutes
  FAST: 30 * 1000, // 30 seconds
  SLOW: 5 * 60 * 1000, // 5 minutes
};

// Maximum number of departures to display
export const MAX_DEPARTURES = 10;

// Status colors mapping
export const STATUS_COLORS = {
  green: 'success',
  yellow: 'warning',
  red: 'destructive',
  gray: 'secondary',
};

