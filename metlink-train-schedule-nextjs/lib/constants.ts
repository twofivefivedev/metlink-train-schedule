/**
 * Application constants
 * Centralized location for all magic strings and configuration values
 */

// Metlink API Configuration
export const METLINK_API_BASE = 'https://api.opendata.metlink.org.nz/v1';

// Service IDs
export const SERVICE_IDS = {
  WAIRARAPA_LINE: 'WRL',
} as const;

// Station Codes
export const STATIONS = {
  WELLINGTON: 'WELL',
  PETONE: 'PETO',
  FEATHERSTON: 'FEAT',
} as const;

// Station Names (for display)
export const STATION_NAMES = {
  WELL: 'Wellington',
  PETO: 'Petone',
  FEAT: 'Featherston',
} as const;

// Cache Configuration
export const CACHE_DURATION = {
  DEFAULT: 1 * 60 * 1000, // 1 minute in milliseconds
  MIN: 30 * 1000, // 30 seconds minimum
  MAX: 5 * 60 * 1000, // 5 minutes maximum
} as const;

// API Configuration
export const API_CONFIG = {
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second base delay
} as const;

// Direction Constants
export const DIRECTIONS = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
} as const;

// Wellington Station Identifiers
export const WELLINGTON_STOPS = ['WELL', 'WELL1', 'WELL2'] as const;

// Refresh intervals (in milliseconds)
export const REFRESH_INTERVALS = {
  DEFAULT: 2 * 60 * 1000, // 2 minutes
  FAST: 30 * 1000, // 30 seconds
  SLOW: 5 * 60 * 1000, // 5 minutes
} as const;

// Maximum number of departures to display
export const MAX_DEPARTURES = 10;

// Status colors mapping
export const STATUS_COLORS = {
  green: 'success',
  yellow: 'warning',
  red: 'destructive',
  gray: 'secondary',
} as const;

