/**
 * Application constants
 * Centralized location for all magic strings and configuration values
 */

// Metlink API Configuration
const METLINK_API_BASE = 'https://api.opendata.metlink.org.nz/v1';

// Service IDs
const SERVICE_IDS = {
    WAIRARAPA_LINE: 'WRL',
};

// Station Codes
const STATIONS = {
    WELLINGTON: 'WELL',
    PETONE: 'PETO',
    FEATHERSTON: 'FEAT',
};

// Station Names (for display)
const STATION_NAMES = {
    WELL: 'Wellington',
    PETO: 'Petone',
    FEAT: 'Featherston',
};

// Cache Configuration
const CACHE_DURATION = {
    DEFAULT: 1 * 60 * 1000, // 1 minute in milliseconds
    MIN: 30 * 1000, // 30 seconds minimum
    MAX: 5 * 60 * 1000, // 5 minutes maximum
};

// API Configuration
const API_CONFIG = {
    TIMEOUT: 10000, // 10 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second base delay
};

// Direction Constants
const DIRECTIONS = {
    INBOUND: 'inbound',
    OUTBOUND: 'outbound',
};

// Wellington Station Identifiers
const WELLINGTON_STOPS = ['WELL', 'WELL1', 'WELL2'];

module.exports = {
    METLINK_API_BASE,
    SERVICE_IDS,
    STATIONS,
    STATION_NAMES,
    CACHE_DURATION,
    API_CONFIG,
    DIRECTIONS,
    WELLINGTON_STOPS,
};

